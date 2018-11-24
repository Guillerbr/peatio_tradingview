# TradingView Charting Library UDF Data Source

Sample implementation of server-side UDF-compatible data source for [Peatio exchange](https://www.peatio.com/) for [TradingView](https://www.tradingview.com/) [Charting Library](https://www.tradingview.com/HTML5-stock-forex-bitcoin-charting-library/).


## First change api on backend peatio

app/api/api_v2/tools.rb

```
# encoding: UTF-8
# frozen_string_literal: true

module APIv2
  class Tools < Grape::API
    desc 'Get server current time, in seconds since Unix epoch.'
    get "/timestamp" do
      ({"serverTime": (Time.now.to_f * 1000).to_i})
    end
  end
end
```
app/api/api_v2/entities/market.rb

```
# encoding: UTF-8
# frozen_string_literal: true

module APIv2
  module Entities
    class Market < Base
      expose :id, documentation: "Unique market id. It's always in the form of xxxyyy, where xxx is the base currency code, yyy is the quote currency code, e.g. 'btcusd'. All available markets can be found at /api/v2/markets."
      expose :name
      expose :ask_precision
      expose :bid_precision
      expose :bid_unit
      expose :ask_unit
    end
  end
end

```

## Run

```
$ npm install
$ npm start
```

## Image Demo:
![alt text](https://raw.githubusercontent.com/Thedabest/peatio_tradingview/master/img/demo.jpg)

## Links

* [Peatio REST API](https://github.com/rubykube/peatio/blob/master/docs/api/member_api_v2.md)
* [TradingView Charting Library](https://www.tradingview.com/HTML5-stock-forex-bitcoin-charting-library/)
* [TradingView Charting Library Demo](https://charting-library.tradingview.com/)
* [TradingView GitHub](https://github.com/tradingview)
