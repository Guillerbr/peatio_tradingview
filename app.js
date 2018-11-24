const express = require('express')
const app = express()

const morgan = require('morgan')
const cors = require('cors')

app.use(morgan('tiny'))
app.use(cors({credentials: true, origin: true}))

const PeatioUtils = require('./peatio/utils')
const PeatioAPI = require('./peatio/api')
const peatio = new PeatioAPI()

var symbols = []

const Searcher = require('./searcher')
var searcher = new Searcher([])

const SEPARATE_BY_QUOTE = true

const RESOLUTIONS_INTERVALS_MAP = {
    '1': '1m',
    '3': '3m',
    '5': '5m',
    '15': '15m',
    '30': '30m',
    '60': '1h',
    '120': '2h',
    '240': '4h',
    '360': '6h',
    '480': '8h',
    '720': '12h',
    'D': '1d',
    '1D': '1d',
    '3D': '3d',
    'W': '1w',
    '1W': '1w',
    'M': '1M',
    '1M': '1M',
}

function convertSymbolToSearch(symbol) {
    return {
        symbol: symbol.id.toUpperCase(),
        full_name: symbol.id.toUpperCase(),
        description: symbol.ask_unit.toUpperCase() + ' / ' + symbol.bid_unit.toUpperCase(),
        ticker: symbol.id.toUpperCase(),
        exchange: 'STOCK',
        type: SEPARATE_BY_QUOTE ? symbol.bid_unit.toLowerCase() : 'crypto'
    }
}

function convertSymbolToResolve(symbol) {
    return {
        name: symbol.id.toUpperCase(),
        ticker: symbol.id.toUpperCase(),
        description: `${symbol.ask_unit.toUpperCase()}/${symbol.bid_unit.toUpperCase()}`,
        type: SEPARATE_BY_QUOTE ? symbol.bid_unit.toLowerCase() : 'crypto',
        session: '24x7',
        exchange: 'STOCK',
        listed_exchange: 'STOCK',
        timezone: 'Asia/Singapore',
        has_intraday: true,
        has_daily: true,
        has_weekly_and_monthly: true,
        pricescale: Math.pow(10, symbol.bid_precision),
        minmovement: 1,
        minmov: 1,
        minmovement2: 0,
        minmov2: 0,
    }
}

function convertKlinesToBars(klines) {
    return {
        s: 'ok',
        t: klines.map(b => parseFloat(b[0])),
        c: klines.map(b => parseFloat(b[4])),
        o: klines.map(b => parseFloat(b[1])),
        h: klines.map(b => parseFloat(b[2])),
        l: klines.map(b => parseFloat(b[3])),
        v: klines.map(b => parseFloat(b[5]))
    }
}

function resolve(ticker) {
    const comps = ticker.split(':')
    const exchange = (comps.length > 1 ? comps[0] : '').toUpperCase()
    const symbol = (comps.length > 1 ? comps[1] : ticker)
	console.log(symbol)

    for (let item of symbols) {
        if (item.id == symbol.toLowerCase() && (exchange.length == 0 || exchange == 'STOCK')) {
            return item
        }
    }
    return null
}

app.get('/config', (req, res) => {
    let symbolsTypes = []
    if (SEPARATE_BY_QUOTE) {
        const quotes = PeatioUtils.quotes(symbols)
            .sort(String.localeCompare)
            .map((s) => { return { name: s, value: s.toLowerCase() } })

        symbolsTypes = [{ name: 'All', value: '' }].concat(quotes)
    } else {
        symbolsTypes = [{
            name: 'Cryptocurrency',
            value: 'crypto'
        }]
    }

    res.send({
        supports_search: true,
        supports_group_request: false,
        supports_marks: false,
        supports_timescale_marks: false,
        supports_time: true,
        exchanges: [
            {
                value: 'STOCK',
                name: 'Peatio',
                desc: ''
            }
        ],
        symbols_types: symbolsTypes,
        supported_resolutions: [
            '1', '3', '5', '15', '30',                  // Minutes
            '60', '120', '240', '360', '480', '720',    // Hours
            '1D', '3D',                                 // Days
            '1W',                                       // Weeks
            '1M'                                        // Months
        ]
    })
})

app.get('/symbols', (req, res) => {
    if (!req.query.symbol) {
        return res.status(400).send({ s: 'error', errmsg: 'Need symbol in query' })
    }

    const symbol = resolve(req.query.symbol)
    if (!symbol) {
        return res.status(404).send({ s: 'no_data' })
    }

    res.send(convertSymbolToResolve(symbol))
})

app.get('/quotes', (req, res) => {
    if (!req.query.symbols) {
        return res.status(400).send({ s: 'error', errmsg: 'Need symbols in query' })
    }

    const symbols = resolve(req.query.symbols)
    if (!symbols) {
        return res.status(404).send({ s: 'no_data' })
    }

    res.send(convertSymbolToResolve(symbols))
})

app.get('/search', (req, res) => {
    res.send(searcher.search(
        req.query.query,
        req.query.type,
        req.query.exchange,
        req.query.limit
    ))
})

app.get('/history', (req, res) => {
    let from = req.query.from
    if (!from) {
        return res.status(400).send({s: 'error', errmsg: 'Need from in query'})
    }

    let to = req.query.to
    if (!to) {
        return res.status(400).send({s: 'error', errmsg: 'Need to in query'})
    }

    if (!req.query.symbol) {
        return res.status(400).send({s: 'error', errmsg: 'Need symbol in query'})
    }

    if (!req.query.resolution) {
        return res.status(400).send({s: 'error', errmsg: 'Need resolution in query'})
    }

    const interval = req.query.resolution
	const symbol = req.query.symbol.toLowerCase()
    if (!interval) {
        return res.status(400).send({s: 'error', errmsg: 'Unsupported resolution'})
    }

    //console.log('------------------------------')
    //console.log('From:', new Date(from).toUTCString())
    //console.log('To:  ', new Date(to).toUTCString())

    let totalKlines = []

    function finishKlines() {
        //console.log('Total:', totalKlines.length)
        if (totalKlines.length == 0) {
            res.send({
                s: 'no_data'
            })
        } else {
            res.send(convertKlinesToBars(totalKlines))
        }
    }

    function getKlines(from, to) {
        peatio.klines(symbol, interval, from, to, 500).then(klines => {
            totalKlines = totalKlines.concat(klines)
            //console.log(klines.length)
    
            if (klines.length == 500) {
                from = klines[klines.length - 1][0] + 1
                getKlines(from, to)
            } else {
                finishKlines()
            }        
        }).catch(err => {
            console.error(err)
            res.status(500).send({s: 'error', errmsg: 'Internal error'})
        })
    }

    getKlines(from, to)
})

app.get('/time', (req, res) => {
    peatio.time().then(json => {
        res.send(Math.floor(json.serverTime) + '')
    }).catch(err => {
        console.error(err)
        res.status(500).send()
    })
})

function listen() {
    const port = process.env.PORT || 8888
    app.listen(port, () => {
        console.log(`Listening on port ${port}\n`)
    })
}

peatio.exchangeInfo().then(info => {
    console.log(`Load ${info.length} symbols`)
    symbols = info
    searcher = new Searcher(info.map(convertSymbolToSearch))
    listen()
}).catch(err => {
    console.error(err)
    process.exit(1)
})
