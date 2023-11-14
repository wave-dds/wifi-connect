import React from 'react';
import logo from '../img/wavelogo.svg';
import styled from 'styled-components';
import { Navbar as OriginalNavbar, Provider, Container } from 'rendition';
import { NetworkInfoForm } from './NetworkInfoForm';
import { Notifications } from './Notifications';
import { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
	@font-face {
		font-family: 'Avenir';
		src: url('/static/fonts/Avenir/AvenirLTStd-Roman.otf');
	}

	body {
		margin: 0;
		font-family: 'Avenir', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
			'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
			sans-serif;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	code {
		font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New', monospace;
	}
`;

const Navbar = styled(OriginalNavbar)`
	background-color: #fff;
	box-shadow: rgba(33, 35, 38, 0.085) 0px 10px 10px -10px;
	display: flex;
	justify-content: center;
	align-items: center;
`;

const StyledContainer = styled(Container)`
	font-family: 'Avenir', sans-serif;
`;

export interface NetworkInfo {
	ssid?: string;
	identity?: string;
	passphrase?: string;
}

export interface Network {
	ssid: string;
	security: string;
}

const App = () => {
	const [attemptedConnect, setAttemptedConnect] = React.useState(false);
	const [isFetchingNetworks, setIsFetchingNetworks] = React.useState(true);
	const [error, setError] = React.useState('');
	const [availableNetworks, setAvailableNetworks] = React.useState<Network[]>(
		[],
	);

	const fetchNetworks = () => {
		setIsFetchingNetworks(true);
		fetch('/networks')
			.then((data) => {
				if (data.status !== 200) {
					throw new Error(data.statusText);
				}

				return data.json();
			})
			.then(setAvailableNetworks)
			.catch((e: Error) => {
				setError(`Failed to fetch available networks. ${e.message || e}`);
			})
			.finally(() => {
				setIsFetchingNetworks(false);
			});
	};

	React.useEffect(() => {
		fetchNetworks();
	}, []);

	const onConnect = (data: NetworkInfo) => {
		setAttemptedConnect(true);
		setError('');

		fetch('/connect', {
			method: 'POST',
			body: JSON.stringify(data),
			headers: {
				'Content-Type': 'application/json',
			},
		})
			.then((resp) => {
				if (resp.status !== 200) {
					throw new Error(resp.statusText);
				}
			})
			.catch((e: Error) => {
				setError(`Failed to connect to the network. ${e.message || e}`);
			});
	};

	return (
		<Provider>
			<GlobalStyle />
			<Navbar
				brand={
					<img
						src={logo}
						style={{ height: 30, paddingLeft: 25 }}
						alt="WAVE Drowning Detection Systems"
					/>
				}
			/>

			<StyledContainer>
				<Notifications
					attemptedConnect={attemptedConnect}
					hasAvailableNetworks={
						isFetchingNetworks || availableNetworks.length > 0
					}
					error={error}
				/>
				{!attemptedConnect && (
					<NetworkInfoForm
						fetchNetworks={fetchNetworks}
						availableNetworks={availableNetworks}
						onSubmit={onConnect}
					/>
				)}
				<NetworkInfoForm
					fetchNetworks={fetchNetworks}
					availableNetworks={availableNetworks}
					onSubmit={onConnect}
				/>
			</StyledContainer>
		</Provider>
	);
};

export default App;
