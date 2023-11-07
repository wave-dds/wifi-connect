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

const getUiSchema = (isEnterprise: boolean): RenditionUiSchema => ({
	ssid: {
		'ui:placeholder': 'Select SSID',
		'ui:options': {
			emphasized: true,
		},
	},
	identity: {
		'ui:options': {
			emphasized: true,
		},
		'ui:widget': !isEnterprise ? 'hidden' : undefined,
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

	const isSelectedNetworkEnterprise = isEnterpriseNetwork(
		availableNetworks,
		data.ssid,
	);

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
					Please select your Wi-Fi from the dropdown and enter the Wi-Fi
					passphrase to connect your WAVE system.
					<Button
						ml={[0, 3]}
						tertiary
						plain
						icon={<RefreshIcon />}
						onClick={fetchNetworks}
					>
						Rescan
					</Button>
				</Flex>
			</Heading.h3>

			<Form
				width={['100%', '80%', '60%', '40%']}
				onFormChange={({ formData }) => {
					setData(formData);
				}}
				onFormSubmit={({ formData }) => onSubmit(formData)}
				value={data}
				schema={getSchema(availableNetworks)}
				uiSchema={getUiSchema(isSelectedNetworkEnterprise)}
				submitButtonProps={{
					width: '60%',
					mx: '20%',
					mt: 3,
					disabled: availableNetworks.length <= 0,
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
