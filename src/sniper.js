require('dotenv').config()
const Web3 = require('web3')
const chalk = require('chalk')
const Contract = require('./helpers/contract')
const Decode = require('./utils/decode')
const Types = require('./utils/types')
const Web3Wss = require('./services/web3Wss')

var store
var config, tokens
const log = console.log

const updateLocalStore = () => {
    config = store.get('config')
    tokens = store.get('tokens')
}

const _saveToken = async (pair) => {
    const token = {
        address: pair.address,
        status: pair.status,
        liquidity: pair.liquidity,
        network: pair.network,
        pair: pair.pair,
        buyAmount: 0,
        decimals: 18
    }

    const tokenIndex = getTokenIndexByAddress(token.address)
    if (tokenIndex < 0) {
        log(chalk.green(`Saving... ${token.address}`))
        const ContractToken = (await Contract.Instance(Types.TOKEN, token.address, config)).methods
        token['decimals'] = parseInt((await ContractToken.decimals().call()))
        token['name'] = await ContractToken.name().call()
        token['symbol'] = await ContractToken.symbol().call()
        tokens.push(token)
    } else {
        log(chalk.green(`Updating... ${token.address}`))
        token['decimals'] = tokens[tokenIndex].decimals
        token['name'] = tokens[tokenIndex].name
        token['symbol'] = tokens[tokenIndex].symbol
        token['liquidity'] = tokens[tokenIndex].liquidity
        if ('transactionHash' in pair) {
            token['transactionHash'] = pair.transactionHash
            token['buyAmount'] = tokens[tokenIndex].buyAmount > pair.buyAmount ?
                tokens[tokenIndex].buyAmount : pair.buyAmount
        }
        tokens[tokenIndex] = token
    }

    store.put('tokens', tokens)
    updateLocalStore()
}

const getTokenIndexByAddress = (address) => {
    for (var i = 0; i < tokens.length; i++)
        if (tokens[i].address.toLowerCase() === address.toLowerCase())
            return i

    return -1
}

const Init = async (_store) => {
    store = _store
    updateLocalStore()

    Web3Wss.subscribePairCreated(Contract, config, async (pairs) => {
        for (var i = 0; i < pairs.length; i++) {
            const pair = pairs[i]
            if (pair.liquidity.good_liquidity) {
                if (pair.token0.toLowerCase() === config.wbnbContract.toLowerCase()
                    || pair.token1.toLowerCase() === config.wbnbContract.toLowerCase()) {

                    if (pair.token0.toLowerCase() === config.wbnbContract.toLowerCase()) {
                        const tempPair = pair.token0
                        pair['token0'] = pair.token1
                        pair['token1'] = tempPair
                    }


                    pair['address'] = pair.token0
                    pair['status'] = 'found'
                    pair['network'] = config.network
                    pair['liquidity'] = pair.liquidity.bnb

                    await _saveToken(pair)

                    if (!config.autoSniping)
                        Web3Wss.cancelPairCreatedSubscription()
                }
            }
        }
    })
}

const Buy = async (token, _store) => {
    store = _store
    updateLocalStore()

    const amount = config.buyAmount
    const ContractPCS = (await Contract.Instance(Types.ROUTER, config.pcsRouterContract, config)).methods
    const ContractWBNB = (await Contract.Instance(Types.TOKEN, config.wbnbContract, config)).methods
    const tokenIn = config.wbnbContract
    const tokenOut = token.address

    const amountIn = Decode.ToWei(amount, 18)

    log(chalk.yellow('Checking WBNB allowance...'))
    var tx = {}
    const supply = await ContractWBNB.totalSupply().call()
    const allowance = await ContractWBNB.allowance(config.userAddress, config.pcsRouterContract).call()

    if (Decode.FromWei(allowance.toString(), token.decimals) >= Decode.FromWei(supply.toString(), token.decimals)) {
        log(chalk.green('Already approved'))
        tx['status'] = true
    } else {
        log(chalk.yellow('Approving...'))
        tx = await ContractWBNB.approve(
            config.pcsRouterContract,
            Web3.utils.toBN('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff').toString()
        ).send()
    }

    if (tx.status) {
        const amounts = await ContractPCS.getAmountsOut(amountIn, [tokenIn, tokenOut]).call()
        var amountOutMin = Decode.FromWei(amounts[amounts.length - 1], token.decimals)
        const expectedAmount = amountOutMin
        amountOutMin -= ((amountOutMin * (config.slippage / 100)))

        log(chalk.green(`
         Buying ${tokenOut}
         =================
         amountIn: ${amount.toString()} ${tokenIn} WBNB
         amountOut: ${parseFloat(expectedAmount)} ${tokenOut}}
       `))

        Decode.ToWei(amountOutMin, token.decimals)
        const tx2 = await ContractPCS.swapExactETHForTokens(
            Decode.ToWei(amountOutMin, token.decimals),
            [tokenIn, tokenOut],
            config.userAddressSell,
            Date.now() + 1000 * 60 * 10
        ).send({ value: amountIn.toString(), gas: 1000000 })

        if (tx2.status) {
            const receipt = await tx2.transactionHash

            log(chalk.green(
                `${tokenOut} bought successfully`))
            log(chalk.green(`https://bscscan.com/tx/${receipt}`))
            log(chalk.green('================='))

            token['transactionHash'] = receipt
            token['buyAmount'] = amount
            token['tokenAmount'] = parseFloat(expectedAmount)
            token['status'] = 'bought'

            await _saveToken(token)
        } else log(chalk.red(`ERROR: can't buy ${tokenOut}`))
    } else
        log(chalk.red(`ERROR: Not allowence for ${tokenOut}`))
}

function Stop() {
    Web3Wss.cancelPairCreatedSubscription()
}


module.exports = {
    Init,
    Stop,
    Buy
}