import { JSONSchema7 as JSONSchema } from 'json-schema';
import * as React from 'react';
import { Button, Flex, Form, Heading, RenditionUiSchema } from 'rendition';
import { Network, NetworkInfo } from './App';
import { RefreshIcon } from './RefreshIcon';

const getSchema = (
	availableNetworks: Network[],
	isManualSsid: boolean,
): JSONSchema => ({
	type: 'object',
	properties: {
		ssid: !isManualSsid
			? {
					title: 'SSID',
					type: 'string',
					default: availableNetworks[0]?.ssid,
					anyOf: availableNetworks.map((network) => ({
						const: network.ssid,
						title: network.ssid,
					})),
			  }
			: { type: 'string', title: '' },
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
				<Flex flexDirection="column" alignItems="center" flexWrap="wrap">
					{isManualSsid
						? 'Please enter your Wi-Fi SSID and enter the WiFi passphrase to connect your WAVE system.'
						: 'Please select your Wi-Fi from the dropdown and enter the Wi-Fi passphrase to connect your WAVE system.'}
					{!isManualSsid && (
						<Button
							ml={[0, 3]}
							mt="1"
							tertiary
							plain
							icon={<RefreshIcon />}
							onClick={fetchNetworks}
						>
							Rescan
						</Button>
					)}
					<Button ml={[0, 3]} mt="3" tertiary plain onClick={toggleManualSsid}>
						{isManualSsid
							? 'Choose Wi-Fi from List'
							: 'Enter Wi-Fi SSID Manually'}
					</Button>
				</Flex>
			</Heading.h3>

			<Form
				width={['100%', '80%', '60%', '40%']}
				onFormChange={({ formData }) => {
					setShowIdentity(formData.showIdentity);
					setData(formData);
				}}
				onFormSubmit={({ formData }) => {
					if (!formData.ssid && !formData.manualSsid) {
						alert('Either SSID or Manual SSID is required');
						return;
					}
					const adjustedFormData = {
						...formData,
						ssid: isManualSsid ? formData.manualSsid : formData.ssid,
					};
					onSubmit(adjustedFormData);
				}}
				value={data}
				schema={getSchema(availableNetworks, isManualSsid)}
				uiSchema={getUiSchema(
					isSelectedNetworkEnterprise,
					isManualSsid,
					showIdentity,
				)}
				submitButtonProps={{
					width: '60%',
					mx: '20%',
					mt: 3,
					disabled:
						availableNetworks.length <= 0 && !data.ssid && !data.manualSsid,
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
