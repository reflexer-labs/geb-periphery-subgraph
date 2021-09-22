import { BigInt, BigDecimal, Bytes, ethereum, log } from '@graphprotocol/graph-ts'
import {
  AddAuthorization,
  IncreaseBidSize,
  ModifyParameters as ModifyParametersUint,
  ModifyParameters1 as ModifyParametersAddress,
  RecyclingSurplusAuctionHouse,
  RestartAuction,
  SettleAuction,
  StartAuction,
} from '../../generated/RecyclingSurplusAuctionHouse/RecyclingSurplusAuctionHouse'
import {
  EnglishAuction,
  EnglishAuctionBid,
  EnglishAuctionConfiguration,
} from '../../generated/schema'
import * as decimal from '../utils/decimal'
import * as integer from '../utils/integer'

let EnglishAuctionType_RECYCLING_SURPLUS = 'RECYCLING_SURPLUS'
let EnglishBidType_INCREASE_BUY = 'INCREASE_BUY'
let Token_PROTOCOL_TOKEN = 'PROTOCOL_TOKEN'
let Token_COIN = 'COIN'

export function handleAddAuthorization(event: AddAuthorization): void {
  initializeAuctionHouse(event)
}
export function handleModifyParametersUint(event: ModifyParametersUint): void {
  initializeAuctionHouse(event)
}
export function handleModifyParametersAddress(event: ModifyParametersAddress): void {
  initializeAuctionHouse(event)
}

function initializeAuctionHouse(event: ethereum.Event): void {
  let config = EnglishAuctionConfiguration.load(EnglishAuctionType_RECYCLING_SURPLUS)
  if (config == null) {
    log.info('Creating a new english auction configuration for {}', [
      EnglishAuctionType_RECYCLING_SURPLUS,
    ])
    config = new EnglishAuctionConfiguration(EnglishAuctionType_RECYCLING_SURPLUS)
  }

  let contract = RecyclingSurplusAuctionHouse.bind(event.address)
  config.bidIncrease = decimal.fromWad(contract.bidIncrease())
  config.bidDuration = contract.bidDuration()
  config.totalAuctionLength = contract.totalAuctionLength()

  config.save()
}

export function handleIncreaseBidSize(event: IncreaseBidSize): void {
  increaseBidSize(
    event.params.id,
    decimal.fromWad(event.params.bid),
    event.params.highBidder,
    event.params.bidExpiry,
    event,
  )
}

export function handleRestartAuction(event: RestartAuction): void {
  restartAuction(event.params.id, event.params.auctionDeadline)
}

export function handleSettleAuction(event: SettleAuction): void {
  settleAuction(event.params.id, event)
}

export function handleStartAuction(event: StartAuction): void {
  let config = EnglishAuctionConfiguration.load(EnglishAuctionType_RECYCLING_SURPLUS)

  if (config == null) {
    log.error('handleStartAuction (Recycling surplus) - auction configuration not found', [])
  }

  let id = event.params.id
  let auction = new EnglishAuction(auctionId(id))
  auction.auctionId = id
  auction.numberOfBids = integer.ZERO
  auction.englishAuctionType = EnglishAuctionType_RECYCLING_SURPLUS
  auction.buyToken = Token_PROTOCOL_TOKEN
  auction.sellToken = Token_COIN
  auction.sellInitialAmount = decimal.fromWad(event.params.amountToSell)
  auction.buyInitialAmount = decimal.fromWad(event.params.initialBid)
  auction.sellAmount = auction.sellInitialAmount
  auction.buyAmount = auction.buyInitialAmount
  auction.startedBy = event.address
  auction.isClaimed = false
  auction.createdAt = event.block.timestamp
  auction.createdAtBlock = event.block.number
  auction.createdAtTransaction = event.transaction.hash
  auction.englishAuctionConfiguration = EnglishAuctionType_RECYCLING_SURPLUS
  auction.auctionDeadline = config.totalAuctionLength.plus(event.block.timestamp)

  auction.save()
}

function increaseBidSize(
  id: BigInt,
  bidAmount: BigDecimal,
  highBidder: Bytes,
  bidExpiry: BigInt,
  event: ethereum.Event,
): void {
  let auction = EnglishAuction.load(auctionId(id))
  let bid = new EnglishAuctionBid(bidAuctionId(id, auction.numberOfBids))

  bid.bidNumber = auction.numberOfBids
  bid.type = EnglishBidType_INCREASE_BUY
  bid.auction = auction.id
  bid.sellAmount = auction.sellInitialAmount
  bid.buyAmount = bidAmount
  bid.price = bid.sellAmount.div(bid.buyAmount)
  bid.bidder = highBidder
  bid.createdAt = event.block.timestamp
  bid.createdAtBlock = event.block.number
  bid.createdAtTransaction = event.transaction.hash
  bid.save()

  auction.numberOfBids = auction.numberOfBids.plus(integer.ONE)
  auction.auctionDeadline = bidExpiry
  auction.sellAmount = bid.sellAmount
  auction.buyAmount = bid.buyAmount
  auction.price = bid.price
  auction.winner = bid.bidder
  auction.save()
}

function restartAuction(id: BigInt, auctionDeadline: BigInt): void {
  let auction = EnglishAuction.load(auctionId(id))
  auction.auctionDeadline = auctionDeadline
  auction.save()
}

function settleAuction(id: BigInt, event: ethereum.Event): void {
  let auction = EnglishAuction.load(auctionId(id))
  auction.isClaimed = true
  auction.save()
}

function auctionId(auctionId: BigInt): string {
  return EnglishAuctionType_RECYCLING_SURPLUS + '-' + auctionId.toString()
}

function bidAuctionId(auctionId: BigInt, bidNumber: BigInt): string {
  return (
    EnglishAuctionType_RECYCLING_SURPLUS + '-' + auctionId.toString() + '-' + bidNumber.toString()
  )
}
