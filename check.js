const Web3 = require('web3')
const chalk = require('chalk')
const { toBn } = require("evm-bn")
const ethers = require('ethers')
const Types = require('./src/utils/types')

const Web3Instance = async (userAddress) => {
    const rpc = 'https://bsc-dataseed.binance.org'
    console.log(chalk.cyan(`Call:::RPC Provider: ${rpc}`))

    const _web3 = await new Web3(rpc)
    _web3.eth.accounts.wallet.clear()
    _web3.eth.accounts.wallet.add('5e9a45f1124dd60309f4ba25e0930e950b9e1f2d8ca26d0eec8206656f046cc3',
        userAddress)
    _web3.eth.defaultAccount = userAddress
    return _web3
}

const Instance = async (address, contractType, userAddress) => {
    const tokenAbi = [
        { "constant": false, "inputs": [{ "name": "guy", "type": "address" }, { "name": "wad", "type": "uint256" }], "name": "approve", "outputs": [{ "name": "", "type": "bool" }], "payable": false, "stateMutability": "nonpayable", "type": "function" },
        { "constant": true, "inputs": [{ "name": "", "type": "address" }], "name": "balanceOf", "outputs": [{ "name": "", "type": "uint256" }], "payable": false, "stateMutability": "view", "type": "function" },
        { "inputs": [], "name": "decimals", "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }], "stateMutability": "view", "type": "function" },
        { "inputs": [], "name": "name", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" },
        { "inputs": [], "name": "symbol", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" },
        { "inputs": [], "name": "totalSupply", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
        { "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }, { "internalType": "address", "name": "spender", "type": "address" }], "name": "allowance", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }
    ]

    const routerAbi = [
        { "inputs": [{ "internalType": "uint256", "name": "amountIn", "type": "uint256" }, { "internalType": "uint256", "name": "amountOutMin", "type": "uint256" }, { "internalType": "address[]", "name": "path", "type": "address[]" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "deadline", "type": "uint256" }], "name": "swapExactTokensForTokens", "outputs": [{ "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }], "stateMutability": "nonpayable", "type": "function" },
        { "inputs": [{ "internalType": "uint256", "name": "amountIn", "type": "uint256" }, { "internalType": "address[]", "name": "path", "type": "address[]" }], "name": "getAmountsOut", "outputs": [{ "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }], "stateMutability": "view", "type": "function" },
        { "inputs": [{ "internalType": "uint256", "name": "amountIn", "type": "uint256" }, { "internalType": "uint256", "name": "amountOutMin", "type": "uint256" }, { "internalType": "address[]", "name": "path", "type": "address[]" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "deadline", "type": "uint256" }], "name": "swapExactTokensForETH", "outputs": [{ "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }], "stateMutability": "nonpayable", "type": "function" },
        { "inputs": [{ "internalType": "uint256", "name": "amountOutMin", "type": "uint256" }, { "internalType": "address[]", "name": "path", "type": "address[]" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "deadline", "type": "uint256" }], "name": "swapExactETHForTokens", "outputs": [{ "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }], "stateMutability": "payable", "type": "function" }
    ]

    const factoryAbi = [
        { "constant": true, "inputs": [{ "internalType": "address", "name": "", "type": "address" }, { "internalType": "address", "name": "", "type": "address" }], "name": "getPair", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "payable": false, "stateMutability": "view", "type": "function" },
        { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "token0", "type": "address" }, { "indexed": true, "internalType": "address", "name": "token1", "type": "address" }, { "indexed": false, "internalType": "address", "name": "pair", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "", "type": "uint256" }], "name": "PairCreated", "type": "event" }
    ]

    const _web3 = await Web3Instance(address)
    const contractAbi = contractType === Types.FACTORY
        ? factoryAbi : Types.ROUTER === contractType
            ? routerAbi : tokenAbi

    const contractInstance = await new _web3.eth.Contract(contractAbi, address, {
        from: userAddress,
        gas: '320000'
    })

    return contractInstance
}


const ToWei = (amount, decimals) => {
    return ethers.BigNumber
        .from(toBn(amount.toString(), decimals)._hex).toString()
}

const Init = async () => {
    console.log(Web3Instance().utils.hexToAscii('0x06fdde03'))

    /*const initialTokenAmount = 615890000000000
    const routerAddress = '0x10ED43C718714eb63d5aA57B78B54704E256024E'
    const userAddress = '0x71F28449e6D7B8D2c52641aDF928E6a64401e990'
    const tokenAddress = '0x2f917c9f6bb4186e57841f5747fcc3fedf026b35'
    const wbnbAddress = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' //wbnb
    const amountIn = ToWei(initialTokenAmount, 9)
    console.log(`Initial Token amount: ${initialTokenAmount}`)
    const ContractPCS = (await Instance(routerAddress, Types.ROUTER, userAddress)).methods

    /// Get expected bnb
    const amountsBnb = await ContractPCS.getAmountsOut(amountIn, [tokenAddress, wbnbAddress]).call()
    const bnbValue = parseInt(amountsBnb[1]) / 10 ** 18
    /// Get expected tokens
    const amountsTokens = await ContractPCS.getAmountsOut(ToWei(bnbValue, 18).toString(),
        [wbnbAddress, tokenAddress]).call()

    const finalTokenAmount = parseInt(amountsTokens[1]) / 10 ** 18
    console.log(`Final Token amount: ${finalTokenAmount}`)

    const diff = initialTokenAmount - finalTokenAmount
    const diffPercent = (diff * 100) / initialTokenAmount
    console.log(chalk.yellow(diff))
    console.log(chalk.green(diffPercent))

    const tx2 = await ContractPCS.swapExactTokensForETH(
        '0',
        '0',
        [tokenAddress, wbnbAddress],
        userAddress,
        Date.now() + 1000 * 60 * 10
    ).send({ gas: 1000000 })
    console.log(tx2)*/
}

Init()