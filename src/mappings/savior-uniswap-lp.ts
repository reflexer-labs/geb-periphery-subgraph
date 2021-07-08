import { Address, ethereum } from '@graphprotocol/graph-ts'
import {
  Deposit,
  SaveSAFE,
  Withdraw,
} from '../../generated/CoinNativeSavior/NativeUnderlyingUniswapV2SafeSaviour'

import { SaviorBalance, SaviorBalanceChange } from '../../generated/schema'

import * as decimal from '../utils/decimal'
import { eventUid } from '../utils/ethereum'

export function handleSaveSAFE(event: SaveSAFE): void {
  let balance = getOrCreateSaviorBalance(event.address, event.params.safeHandler, event)

  let change = new SaviorBalanceChange(eventUid(event))
  change.saviorAddress = event.address
  change.address = event.params.safeHandler
  // The balance is wiped
  change.deltaBalance = balance.balance.neg()
  change.createdAt = event.block.timestamp
  change.createdAtBlock = event.block.number
  change.createdAtTransaction = event.transaction.hash
  change.save()

  balance.balance = decimal.ZERO
  balance.save()
}

export function handleDeposit(event: Deposit): void {
  let balance = getOrCreateSaviorBalance(event.address, event.params.safeHandler, event)
  balance.balance = balance.balance.plus(decimal.fromWad(event.params.lpTokenAmount))
  balance.save()

  let change = new SaviorBalanceChange(eventUid(event))
  change.saviorAddress = event.address
  change.address = event.params.safeHandler
  change.deltaBalance = decimal.fromWad(event.params.lpTokenAmount)
  change.createdAt = event.block.timestamp
  change.createdAtBlock = event.block.number
  change.createdAtTransaction = event.transaction.hash
  change.save()
}

export function handleWithdraw(event: Withdraw): void {
  let balance = getOrCreateSaviorBalance(event.address, event.params.safeHandler, event)
  balance.balance = balance.balance.minus(decimal.fromWad(event.params.lpTokenAmount))
  balance.save()

  let change = new SaviorBalanceChange(eventUid(event))
  change.saviorAddress = event.address
  change.address = event.params.safeHandler
  change.deltaBalance = decimal.fromWad(event.params.lpTokenAmount).neg()
  change.createdAt = event.block.timestamp
  change.createdAtBlock = event.block.number
  change.createdAtTransaction = event.transaction.hash
  change.save()
}

function getOrCreateSaviorBalance(
  savior: Address,
  safeHandler: Address,
  event: ethereum.Event,
): SaviorBalance {
  let id = saviorId(savior, safeHandler)
  let balance = SaviorBalance.load(id)
  if (balance == null) {
    balance = new SaviorBalance(id)
    balance.saviorAddress = savior
    balance.address = safeHandler
    balance.balance = decimal.ZERO

    balance.createdAt = event.block.timestamp
    balance.createdAtBlock = event.block.number
    balance.createdAtTransaction = event.transaction.hash
  }
  balance.save()
  return balance as SaviorBalance
}

export function saviorId(savior: Address, safeHandler: Address): string {
  return savior.toHexString() + '-' + safeHandler.toHexString()
}
