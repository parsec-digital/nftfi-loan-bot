// Deploy
yarn hardhat setup --network goerli --owner 0x5bD000ae659d81251426be803b18757fcCdd9dAF

// Verify
yarn hardhat verifyEtherscan --network goerli --guard 0x9893aC60FBe737c2ED330d770c13Ccd03ec7131f --owner 0x5bD000ae659d81251426be803b18757fcCdd9dAF

// Set Target
yarn hardhat setTargetAllowed --network goerli --guard 0x9893aC60FBe737c2ED330d770c13Ccd03ec7131f --target 0x5bD000ae659d81251426be803b18757fcCdd9dAF // Mike
yarn hardhat setTargetAllowed --network goerli --guard 0x9893aC60FBe737c2ED330d770c13Ccd03ec7131f --target 0xe923036B9a8F217fFe4E93d27647bE665C5c5ddc // Admin Safe

// Transfer Ownership
yarn hardhat transferOwnership --network goerli --guard 0x9893aC60FBe737c2ED330d770c13Ccd03ec7131f --newowner 0xe923036B9a8F217fFe4E93d27647bE665C5c5ddc

////////////////////////////////////////////////////////////

// Deploy
yarn hardhat setup --network goerli --owner 0x5bD000ae659d81251426be803b18757fcCdd9dAF

// Verify
yarn hardhat verifyEtherscan --network goerli --guard 0x6caea2281A3756178acF6e3A8E1896985f601B41 --owner 0x5bD000ae659d81251426be803b18757fcCdd9dAF

<!-- // Set Target
yarn hardhat setTargetAllowed --network goerli --guard 0x9893aC60FBe737c2ED330d770c13Ccd03ec7131f --target 0x5bD000ae659d81251426be803b18757fcCdd9dAF // Mike
yarn hardhat setTargetAllowed --network goerli --guard 0x9893aC60FBe737c2ED330d770c13Ccd03ec7131f --target 0xe923036B9a8F217fFe4E93d27647bE665C5c5ddc // Admin Safe -->

// Transfer Ownership
yarn hardhat transferOwnership --network goerli --guard 0x6caea2281A3756178acF6e3A8E1896985f601B41 --newowner 0xe923036B9a8F217fFe4E93d27647bE665C5c5ddc