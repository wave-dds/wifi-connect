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
						Your device will soon be online. If connection is unsuccessful, the
						Access Point will be back up in a few minutes, and reloading this
						page will allow you to try again.
					</Txt.span>
				</Alert>
			)}
			{!hasAvailableNetworks && (
				<Alert m={2} warning>
					<Txt.span>No Wi-Fi networks available. Click 'Rescan' to search again.</Txt.span>
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
