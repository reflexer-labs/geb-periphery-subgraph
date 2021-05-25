import { Address, ethereum } from '@graphprotocol/graph-ts'
import {
  Deposit,
  SaveSAFE,
  Withdraw,
} from '../../generated/RAIETHSavior/NativeUnderlyingUniswapV2SafeSaviour'

import { SaviorBalance, SaviorBalanceChange } from '../../generated/schema'

import * as decimal from '../utils/decimal'

export function handleSaveSAFE(event: SaveSAFE): void {
  let balance = getOrCreateSaviorBalance(event.address, event.params.safeHandler, event)
  let change = getOrCreateSaviorBalanceChange(event.address, event.params.safeHandler, event)

  // The balance is wiped

  change.deltaBalance = balance.balance.neg()
  change.save()

  balance.balance = decimal.ZERO
  balance.save()
}

export function handleDeposit(event: Deposit): void {
  let balance = getOrCreateSaviorBalance(event.address, event.params.safeHandler, event)
  balance.balance = balance.balance.plus(decimal.fromWad(event.params.lpTokenAmount))
  balance.save()

  let change = getOrCreateSaviorBalanceChange(event.address, event.params.safeHandler, event)
  change.deltaBalance = decimal.fromWad(event.params.lpTokenAmount)
  change.save()
}

export function handleWithdraw(event: Withdraw): void {
  let balance = getOrCreateSaviorBalance(event.address, event.params.safeHandler, event)
  balance.balance = balance.balance.minus(decimal.fromWad(event.params.lpTokenAmount))
  balance.save()

  let change = getOrCreateSaviorBalanceChange(event.address, event.params.safeHandler, event)
  change.deltaBalance = decimal.fromWad(event.params.lpTokenAmount).neg()
  change.save()
}

function getOrCreateSaviorBalance(savior: Address, safeHandler: Address, event: ethereum.Event) {
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

function getOrCreateSaviorBalanceChange(
  savior: Address,
  safeHandler: Address,
  event: ethereum.Event,
) {
  let id = saviorId(savior, safeHandler)
  let change = SaviorBalanceChange.load(id)
  if (change == null) {
    change = new SaviorBalanceChange(id)
    change.saviorAddress = savior
    change.address = safeHandler
    change.deltaBalance = decimal.ZERO

    change.createdAt = event.block.timestamp
    change.createdAtBlock = event.block.number
    change.createdAtTransaction = event.transaction.hash
  }
  change.save()
  return change as SaviorBalanceChange
}

export function saviorId(savior: Address, safeHandler: Address): string {
  return savior.toHexString() + '-' + safeHandler.toHexString()
}
