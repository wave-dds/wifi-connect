import * as React from 'react';
import { Txt, Alert } from 'rendition';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBan } from '@fortawesome/free-solid-svg-icons';

const ErrorPrefix = (
	<React.Fragment>
		<FontAwesomeIcon icon={faBan} />
		<Txt.span> Error!</Txt.span>
	</React.Fragment>
);

export const Notifications = ({
	hasAvailableNetworks,
	attemptedConnect,
	error,
}: {
	hasAvailableNetworks: boolean;
	attemptedConnect: boolean;
	error: string;
}) => {
	return (
		<>
			{attemptedConnect && (
				<Alert m={2} info>
					<Txt.span>Applying changes... </Txt.span>
					<Txt.span>
						Your WAVE device is attempting to connect to your Wi-Fi network.
						Once connected, you will be able to access the device using the WAVE
						DDS Connect app. If the connection is unsuccessful, the WAVENetwork
						WiFi will reappear and you can connect to it and try again.
					</Txt.span>
				</Alert>
			)}
			{!hasAvailableNetworks && (
				<Alert m={2} warning>
					<Txt.span>
						No Wi-Fi networks available. Click 'Rescan' to search again.
					</Txt.span>
				</Alert>
			)}
			{!!error && (
				<Alert m={2} danger prefix={ErrorPrefix}>
					<Txt.span>{error}</Txt.span>
				</Alert>
			)}
		</>
	);
};
