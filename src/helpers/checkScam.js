const Contract = require('./contract')
const types = require('../utils/types')
const { FromWei } = require('../utils/decode')

const getTransferEvents = async (config, tokenAddress, fromBlock) => {
    const token = await Contract.Instance(types.TOKEN, tokenAddress, config)
    const options = {
        fromBlock: fromBlock - 50,
        toBlock: fromBlock + config.numBlocksWithToken - 100
    }

    return await token.getPastEvents('Transfer', options)
}

const getPairAddress = async (config, tokenAddress) => {
    const factory = (await Contract.Instance(types.FACTORY, config.pcsFactoryContract, config)).methods
    return await factory.getPair(tokenAddress, config.wbnbContract).call()
}

const getTokenDecimals = async (config, tokenAddress) => {
    const token = (await Contract.Instance(types.TOKEN, tokenAddress, config)).methods
    return parseInt((await token.decimals().call()))
}

const getTokenSupply = async (config, tokenAddress) => {
    const token = (await Contract.Instance(types.TOKEN, tokenAddress, config)).methods
    return await token.totalSupply().call()
}

const CheckScam = async (token, config) => {
    const tokenAddress = token.address
    const fromBlock = token.blockNumber

    const events = await getTransferEvents(config, tokenAddress, fromBlock)
    const pairAddress = await getPairAddress(config, tokenAddress)

    const decimals = await getTokenDecimals(config, tokenAddress)
    const tokenSupply = FromWei((await getTokenSupply(config, tokenAddress)), decimals)

    const uniqueBuyers = []
    const uniqueSellers = []

    events.forEach(async (event) => {
        const { from, to, value } = JSON.parse(JSON.stringify(event.returnValues).replace('Result', '').trim())

        if (from.toLowerCase() === pairAddress.toLowerCase()) {
            //  buy
            const buyer = {
                address: to,
                amount: FromWei(value, decimals),
                percentOfSupply: 0,
                type: 'buy'
            }

            buyer['percentOfSupply'] = (buyer.amount * 100 / tokenSupply).toFixed(1)
            uniqueBuyers.push(buyer)
        } else if (to.toLowerCase() === pairAddress.toLowerCase()) {
            // sell
            const seller = {
                address: from,
                amount: FromWei(value, decimals),
                percentOfSupply: 0,
                type: 'sell'
            }

            seller['percentOfSupply'] = (seller.amount * 100 / tokenSupply).toFixed(1)
            uniqueSellers.push(seller)
        }
    })

    const topBuyers = getTopBuyerSeller(uniqueBuyers)
    const topSellers = getTopBuyerSeller(uniqueSellers)
    const scamBuyers = topBuyers.length > 0 ? isPossibleScam(uniqueBuyers, topBuyers[0]) : false
    const scamSellers = topSellers.length > 0 ? isPossibleScam(uniqueSellers, topSellers[0]) : false

    return checkSellAllScam(uniqueSellers)
        || checkSellAllScam(uniqueBuyers)
        || scamBuyers
        || scamSellers
}

const checkSellAllScam = (sellers) => {
    return (sellers.find(seller => {
        return parseInt(seller.percentOfSupply) > 20
    })) ? true : false
}

const getTopBuyerSeller = (addresses) => {
    const top = []
    for (var i = 0; i < addresses.length; i++) {
        for (var x = 1; x < addresses.length; x++) {
            if (addresses[i].address.toLowerCase() === addresses[x].address.toLowerCase()) {
                const userIndex = getTopByAddress(top, addresses[i].address)
                if (userIndex > -1) {
                    const count = top[userIndex] ? top[userIndex].count + 1 : 0
                    top[userIndex] = {
                        address: addresses[i].address,
                        count
                    }
                } else {
                    top.push({
                        address: addresses[i].address,
                        count: 0
                    })
                }
            }
        }
    }

    top.sort((a, b) => a.count > b.count ? -1 : 1)
    return top
}

const getTopByAddress = (top, address) => {
    for (var i = 0; i < top.length; i++) {
        if (top[i].address.toLowerCase() === address.toLowerCase())
            return i
    }
    return -1
}

const isPossibleScam = (addresses, scammer) => {
    const limitPercent = 10
    var limitNum = addresses.length * limitPercent / 100
    const count = addresses.filter(addr => addr.address.toLowerCase() === scammer.address.toLowerCase()).length
    return count > limitNum
}

module.exports = {
    CheckScam
}