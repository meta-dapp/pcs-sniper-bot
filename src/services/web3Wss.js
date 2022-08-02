const chalk = require('chalk')
const { isTokenCached } = require('../helpers/TokensCache')
const { FromWei } = require('../utils/decode')
const Types = require('../utils/types')

const sleep = (timeMs) => new Promise(resolve => setTimeout(resolve, timeMs))
var stopPairSubscription = true

const log = console.log

const _getEvents = async (factory, fromBlock, config) => {
    const options = {
        fromBlock
    }

    if (!config.autoSniping)
        options['filter'] = { token0: config.tokenAddress, token1: config.wbnbContract }


    return await factory.getPastEvents('PairCreated', options)
}

const subscribePairCreated = async (contract, config, callback) => {
    log(chalk.green('Starting bot monitor...'))
    log(chalk.yellow(`Network: ${config.network.toUpperCase()}`))

    stopPairSubscription = false

    while (!stopPairSubscription) {
        try {
            const uniquePairsId = []

            const factory = await contract.Instance(Types.FACTORY, config.pcsFactoryContract, config)
            const wbnb = await contract.Instance(Types.TOKEN, config.wbnbContract, config)

            log(chalk.yellow(`Getting block number...`))

            const fromBlock = (await contract.getBlockNumber(config))
                - (!config.autoSniping ? config.numBlocksWithToken
                    : config.numBlocksAuto)

            log(chalk.yellow(`Block Number: ${fromBlock}`))

            const events = await _getEvents(factory, fromBlock, config)

            if (events && events.length > 0) {
                for (var i = 0; i < events.length; i++)
                    if (events[i].event === 'PairCreated') {
                        const { token0, token1, pair } = JSON.parse(JSON.stringify(events[i].returnValues).replace('Result', '').trim())

                        log(chalk.green(`Processing pair... ${pair}`))
                        const pairData = {
                            token0,
                            token1,
                            pair,
                            hash: events[i].transactionHash,
                            blockNumber: events[i].blockNumber
                        }

                        const bnbBalance = await wbnb.methods.balanceOf(pairData.pair).call()

                        pairData['liquidity'] = {
                            bnb: FromWei(bnbBalance, 18),
                            good_liquidity: FromWei(bnbBalance, 18) > config.minLiquidity
                        }

                        if (!isTokenCached(token0.toLowerCase() === config.wbnbContract.toLowerCase() ? token1.toLowerCase() : token0.toLowerCase())) {
                            const found = uniquePairsId.find(p => {
                                return p.pair === pairData.pair
                            })

                            if (!found)
                                uniquePairsId.push(pairData)
                        }
                    }

                callback(uniquePairsId)
            }
        } catch (err) { }

        await sleep(config.wssWaitTime * 1000)
    }
}

const cancelPairCreatedSubscription = () => {
    log(chalk.red('Stoping bot monitor...'))
    stopPairSubscription = true
}

module.exports = {
    subscribePairCreated,
    cancelPairCreatedSubscription
}