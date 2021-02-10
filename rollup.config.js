import pkg from './package.json';

export default [
	{
		input: 'index.cjs.js',
		external: [
			"buffer",
			"noble-secp256k1",
			"ws"
		],
		output: [
			{ file: pkg.main, format: 'cjs' }
		]
	}
];