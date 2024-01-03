use std::error::Error as StdError;
use std::fmt;
use std::net::Ipv4Addr;
use std::sync::mpsc::{Receiver, Sender};
use std::fs::File;
use std::io::Read;

use iron::modifiers::Redirect;
use iron::prelude::*;
use iron::{
    headers, status, typemap, AfterMiddleware, Iron, IronError, IronResult, Request, Response, Url,
};
use iron_cors::CorsMiddleware;
use mount::Mount;
use params::{FromValue, Params};
use path::PathBuf;
use persistent::Write;
use router::Router;
use serde_json;
use staticfile::Static;

use errors::*;
use exit::{exit, ExitResult};
use network::{NetworkCommand, NetworkCommandResponse};

struct RequestSharedState {
    gateway: Ipv4Addr,
    server_rx: Receiver<NetworkCommandResponse>,
    network_tx: Sender<NetworkCommand>,
    exit_tx: Sender<ExitResult>,
}

impl typemap::Key for RequestSharedState {
    type Value = RequestSharedState;
}

struct CompressionMiddleware {
    ui_directory: PathBuf,
}

impl CompressionMiddleware {
    fn new(ui_directory: PathBuf) -> Self {
        Self { ui_directory }
    }
}

impl AfterMiddleware for CompressionMiddleware {
    fn after(&self, req: &mut Request, res: Response) -> IronResult<Response> {
        if let Some(encoding) = req.headers.get::<headers::AcceptEncoding>() {
            let mut path = self.ui_directory.clone();
            path.push(req.url.path().join("/"));
            let mut content_encoding = None;

            for quality_item in encoding.iter() {
                println!("{:?}", quality_item.item);
                match &quality_item.item {
                    &headers::Encoding::EncodingExt(ref s) if s == "br" => {
                        let new_file_name = format!("{}.br", path.file_name().unwrap().to_str().unwrap());
                        path.set_file_name(new_file_name);
                        content_encoding = Some("br");
                        break;
                    }
                    &headers::Encoding::Gzip => {
                        let new_file_name = format!("{}.gz", path.file_name().unwrap().to_str().unwrap());
                        path.set_file_name(new_file_name);
                        content_encoding = Some("gzip");
                        break;
                    }
                    _ => {}
                }
            }

            println!("Path: {:?}", path); // Log the path
            if path.exists() {
                println!("Serving static file: {:?}", path);
                let mut file = File::open(&path).unwrap();
                let mut contents = Vec::new();
                file.read_to_end(&mut contents).unwrap();

                let mut response = Response::with((status::Ok, contents));
                if let Some(encoding) = content_encoding {
                    response.headers.set(headers::ContentEncoding(vec![iron::headers::Encoding::EncodingExt(encoding.to_string())]));
                }
                return Ok(response);
            }
        }

        Ok(res)
    }
}

#[derive(Debug)]
struct StringError(String);

impl fmt::Display for StringError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        fmt::Debug::fmt(self, f)
    }
}

impl StdError for StringError {
    fn description(&self) -> &str {
        &self.0
    }
}

macro_rules! get_request_ref {
    ($req:ident, $ty:ty, $err:expr) => {
        match $req.get_ref::<$ty>() {
            Ok(val) => val,
            Err(err) => {
                error!($err);
                return Err(IronError::new(err, status::InternalServerError));
            }
        }
    };
}

macro_rules! get_param {
    ($params:ident, $param:expr, $ty:ty) => {
        match $params.get($param) {
            Some(value) => match <$ty as FromValue>::from_value(value) {
                Some(converted) => converted,
                None => {
                    let err = format!("Unexpected type for '{}'", $param);
                    error!("{}", err);
                    return Err(IronError::new(
                        StringError(err),
                        status::InternalServerError,
                    ));
                }
            },
            None => {
                let err = format!("'{}' not found in request params: {:?}", $param, $params);
                error!("{}", err);
                return Err(IronError::new(
                    StringError(err),
                    status::InternalServerError,
                ));
            }
        }
    };
}

macro_rules! get_request_state {
    ($req:ident) => {
        get_request_ref!(
            $req,
            Write<RequestSharedState>,
            "Getting reference to request shared state failed"
        )
        .as_ref()
        .lock()
        .unwrap()
    };
}

fn exit_with_error<E>(state: &RequestSharedState, e: E, e_kind: ErrorKind) -> IronResult<Response>
where
    E: ::std::error::Error + Send + 'static,
{
    let description = e_kind.description().into();
    let err = Err::<Response, E>(e).chain_err(|| e_kind);
    exit(&state.exit_tx, err.unwrap_err());
    Err(IronError::new(
        StringError(description),
        status::InternalServerError,
    ))
}

struct RedirectMiddleware;

impl AfterMiddleware for RedirectMiddleware {
    fn catch(&self, req: &mut Request, err: IronError) -> IronResult<Response> {
        let gateway = {
            let request_state = get_request_state!(req);
            format!("{}", request_state.gateway)
        };

        if let Some(host) = req.headers.get::<headers::Host>() {
            if host.hostname != gateway {
                let url = Url::parse(&format!("http://{}/", gateway)).unwrap();
                return Ok(Response::with((status::Found, Redirect(url))));
            }
        }

        Err(err)
    }
}

pub fn start_server(
    gateway: Ipv4Addr,
    listening_port: u16,
    server_rx: Receiver<NetworkCommandResponse>,
    network_tx: Sender<NetworkCommand>,
    exit_tx: Sender<ExitResult>,
    ui_directory: &PathBuf,
) {
    let exit_tx_clone = exit_tx.clone();
    let gateway_clone = gateway;
    let request_state = RequestSharedState {
        gateway,
        server_rx,
        network_tx,
        exit_tx,
    };

    let mut router = Router::new();
    router.get("/", Static::new(ui_directory), "index");
    router.get("/networks", networks, "networks");
    router.post("/connect", connect, "connect");

    let mut assets = Mount::new();
    assets.mount("/", router);
    assets.mount("/static", Static::new(ui_directory.join("static")));
    assets.mount("/css", Static::new(ui_directory.join("css")));
    assets.mount("/img", Static::new(ui_directory.join("img")));
    assets.mount("/js", Static::new(ui_directory.join("js")));

    let cors_middleware = CorsMiddleware::with_allow_any();

    let mut chain = Chain::new(assets);
    chain.link(Write::<RequestSharedState>::both(request_state));
    chain.link_after(RedirectMiddleware);
    chain.link_after(CompressionMiddleware::new(ui_directory.clone()));
    chain.link_around(cors_middleware);

    let address = format!("{}:{}", gateway_clone, listening_port);

    info!("Starting HTTP server on {}", &address);

    if let Err(e) = Iron::new(chain).http(&address) {
        exit(
            &exit_tx_clone,
            ErrorKind::StartHTTPServer(address, e.to_string()).into(),
        );
    }
}

fn networks(req: &mut Request) -> IronResult<Response> {
    info!("User connected to the captive portal");

    let request_state = get_request_state!(req);

    if let Err(e) = request_state.network_tx.send(NetworkCommand::Activate) {
        return exit_with_error(&request_state, e, ErrorKind::SendNetworkCommandActivate);
    }

    let networks = match request_state.server_rx.recv() {
        Ok(result) => match result {
            NetworkCommandResponse::Networks(networks) => networks,
        },
        Err(e) => return exit_with_error(&request_state, e, ErrorKind::RecvAccessPointSSIDs),
    };

    let access_points_json = match serde_json::to_string(&networks) {
        Ok(json) => json,
        Err(e) => return exit_with_error(&request_state, e, ErrorKind::SerializeAccessPointSSIDs),
    };

    Ok(Response::with((status::Ok, access_points_json)))
}

fn connect(req: &mut Request) -> IronResult<Response> {
    let (ssid, identity, passphrase) = {
        let params = get_request_ref!(req, Params, "Getting request params failed");
        let ssid = get_param!(params, "ssid", String);
        let identity = get_param!(params, "identity", String);
        let passphrase = get_param!(params, "passphrase", String);
        (ssid, identity, passphrase)
    };

    debug!("Incoming `connect` to access point `{}` request", ssid);

    let request_state = get_request_state!(req);

    let command = NetworkCommand::Connect {
        ssid,
        identity,
        passphrase,
    };

    if let Err(e) = request_state.network_tx.send(command) {
        exit_with_error(&request_state, e, ErrorKind::SendNetworkCommandConnect)
    } else {
        Ok(Response::with(status::Ok))
    }
}
