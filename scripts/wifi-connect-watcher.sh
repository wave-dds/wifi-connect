#!/bin/sh

# /usr/local/sbin/wifi-connect-watcher.sh

status_file="/var/lib/wifi-connect-watcher/status"
request_file="/var/lib/wifi-connect-watcher/request"
wifi_connect_cmd="sudo DBUS_SYSTEM_BUS_ADDRESS=unix:path=/var/run/dbus/system_bus_socket /usr/local/sbin/wifi-connect -s WAVENetwork -p SaferSwimming -o 4000; echo 'normal_mode' > $status_file"
inotify_pid_file="/tmp/inotifywait_wifi_connect_watcher.pid"

# create folder and files if they don't exist
if [ ! -d "$(dirname "$status_file")" ]; then
    mkdir -p "$(dirname "$status_file")"
fi
if [ ! -f "$status_file" ]; then
    echo "normal_mode" > "$status_file"
fi
if [ ! -f "$request_file" ]; then
    echo "normal_mode" > "$request_file"
fi

# Function to handle the current network status
handle_request() {
    request=$(cat "$request_file")

    case "$request" in
        "connect_mode")
            logger "going to connect mode"
            eval $wifi_connect_cmd &
            echo "connect_mode" > "$status_file"
            ;;
        "normal_mode")
            logger "going to normal mode"
            sudo pkill -f wifi-connect
            echo "normal_mode" > "$status_file"
            ;;
        *)
            logger "Unknown status: $status"
            ;;
    esac
}

# Function to clean up on exit
cleanup() {
    logger "Cleaning up wifi-connect mode manager."
    if [ -f "$inotify_pid_file" ]; then
        inotify_pid=$(cat "$inotify_pid_file")
        sudo kill $inotify_pid
        rm -f "$inotify_pid_file"
        logger "Killed inotifywait process."
    fi
}

trap cleanup EXIT
trap cleanup SIGINT
trap cleanup SIGTERM

# Check for required commands
if ! command -v inotifywait &> /dev/null; then
    logger "inotifywait could not be found. Please install it."
    exit 1
fi

if ! command -v /usr/local/sbin/wifi-connect &> /dev/null; then
    logger "wifi-connect could not be found. Please install it."
    exit 1
fi

# Check initial status at the start
handle_request

# Watch for changes in the status file using inotifywait
while true; do
    inotifywait -e modify "$request_file" &
    echo $! > "$inotify_pid_file"
    wait $!
    handle_request
done
