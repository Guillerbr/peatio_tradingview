const request = require('request')

module.exports = class PeatioAPI {
    time() {
        return this.request('/api/v1/timestamp')
    }

    klines(symbol, interval, startTime, endTime, limit) {
        return this.request('/api/v2/k_with_pending_trades', { qs: { symbol, interval, startTime, endTime, limit } })
    }

    request(path, options) {
        return new Promise((resolve, reject) => {
            request('http://api.wb.local' + path, options, (err, res, body) => {
                if (err) return reject(err)
    
                try {
                    const json = JSON.parse(body)
                    if (json.code) return reject(new Error(`${json.code}: ${json.msg}`))
                    resolve(json)
                } catch (err) {
                    reject(err)
                }
            })
        })
    }
}
