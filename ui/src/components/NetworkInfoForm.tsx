import { JSONSchema7 as JSONSchema } from 'json-schema';
import * as React from 'react';
import { Button, Flex, Form, Heading, RenditionUiSchema } from 'rendition';
import { Network, NetworkInfo } from './App';
import { RefreshIcon } from './RefreshIcon';

const getSchema = (availableNetworks: Network[]): JSONSchema => ({
	type: 'object',
	properties: {
		ssid: {
			title: 'SSID',
			type: 'string',
			default: availableNetworks[0]?.ssid,
			oneOf: availableNetworks.map((network) => ({
				const: network.ssid,
				title: network.ssid,
			})),
		},
		manualSsid: {
			title: 'SSID',
			type: 'string',
			default: '',
		},
		showIdentity: {
			title: 'Use Enterprise Security',
			type: 'boolean',
			default: false,
		},
		identity: {
			title: 'User',
			type: 'string',
			default: '',
		},
		passphrase: {
			title: 'Passphrase',
			type: 'string',
			default: '',
		},
	},
	required: ['ssid'],
});

const getUiSchema = (
	isEnterprise: boolean,
	isManualSsid: boolean,
	showIdentity: boolean,
): RenditionUiSchema => ({
	ssid: {
		'ui:placeholder': 'Select SSID',
		'ui:options': {
			emphasized: true,
		},
		'ui:widget': isManualSsid ? 'hidden' : undefined,
	},
	manualSsid: {
		'ui:placeholder': 'Enter SSID',
		'ui:options': {
			emphasized: true,
		},
		'ui:widget': !isManualSsid ? 'hidden' : undefined,
	},
	showIdentity: {
		'ui:widget': !isManualSsid ? 'hidden' : undefined,
	},
	identity: {
		'ui:options': {
			emphasized: true,
		},
		'ui:widget': !isEnterprise && !showIdentity ? 'hidden' : undefined,
	},
	passphrase: {
		'ui:widget': 'password',
		'ui:options': {
			emphasized: true,
		},
	},
});

const isEnterpriseNetwork = (
	networks: Network[],
	selectedNetworkSsid?: string,
) => {
	return networks.some(
		(network) =>
			network.ssid === selectedNetworkSsid && network.security === 'enterprise',
	);
};

interface NetworkInfoFormProps {
	fetchNetworks: () => void;
	availableNetworks: Network[];
	onSubmit: (data: NetworkInfo) => void;
}

export const NetworkInfoForm = ({
	fetchNetworks,
	availableNetworks,
	onSubmit,
}: NetworkInfoFormProps) => {
	const [data, setData] = React.useState<NetworkInfo>({});
	const [isManualSsid, setIsManualSsid] = React.useState<boolean>(false);
	const [showIdentity, setShowIdentity] = React.useState<boolean>(false);

	const isSelectedNetworkEnterprise = isEnterpriseNetwork(
		availableNetworks,
		data.ssid,
	);

	const toggleManualSsid = () => {
		setIsManualSsid(!isManualSsid);
	};

	return (
		<Flex
			flexDirection="column"
			alignItems="center"
			justifyContent="center"
			m={4}
			mt={5}
		>
			<Heading.h3
				align="center"
				mb={4}
				style={{ color: 'rgba(0,0,0,0.6)', fontSize: '16px', fontWeight: 500 }}
			>
				<Flex flexDirection={['column', 'row']} flexWrap="wrap">
					{isManualSsid
						? 'Please enter your Wi-Fi SSID and enter the WiFi passphrase to connect your WAVE system.'
						: 'Please select your Wi-Fi from the dropdown and enter the Wi-Fi passphrase to connect your WAVE system.'}
					{!isManualSsid && (
						<Button
							ml={[0, 3]}
							tertiary
							plain
							icon={<RefreshIcon />}
							onClick={fetchNetworks}
						>
							Rescan
						</Button>
					)}
					<Button ml={[0, 3]} tertiary plain onClick={toggleManualSsid}>
						{isManualSsid
							? 'Choose Wi-Fi from List'
							: 'Enter Wi-Fi SSID Manually'}
					</Button>
				</Flex>
			</Heading.h3>

			<Form
				width={['100%', '80%', '60%', '40%']}
				onFormChange={({ formData }) => {
					// is this the flickering?
					if (formData.manualSsid) {
						formData.ssid = formData.manualSsid;
					}
					setShowIdentity(formData.showIdentity);
					setData(formData);
				}}
				onFormSubmit={({ formData }) => onSubmit(formData)}
				value={data}
				schema={getSchema(availableNetworks)}
				uiSchema={getUiSchema(
					isSelectedNetworkEnterprise,
					isManualSsid,
					showIdentity,
				)}
				submitButtonProps={{
					width: '60%',
					mx: '20%',
					mt: 3,
					disabled: availableNetworks.length <= 0 && !data.ssid,
					style: {
						backgroundColor: '#2ad2c9',
						borderColor: 'white',
						borderRadius: '4px',
						fontWeight: 500,
						fontSize: '16px',
					},
				}}
				submitButtonText={'Connect'}
			/>
		</Flex>
	);
};
