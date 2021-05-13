import { Address, dataSource } from '@graphprotocol/graph-ts'
import { Transfer, Approval } from '../../generated/Coin/Coin'
import { ERC20Transfer } from '../../generated/schema'
import {
  getOrCreateERC20,
  getOrCreateERC20Balance,
  getOrCreateERC20BAllowance,
  updateAllowance,
} from '../entities/erc20'
import * as decimal from '../utils/decimal'
import { eventUid } from '../utils/ethereum'

const COIN_LABEL = 'COIN'

export function handleTransfer(event: Transfer): void {
  let tokenAddress = dataSource.address()

  let erc20 = getOrCreateERC20(tokenAddress)
  let source = event.params.src
  let destination = event.params.dst
  let amount = decimal.fromWad(event.params.amount)
  let nullAddress = Address.fromHexString('0x0000000000000000000000000000000000000000')

  // Check if it's not a burn before updating destination
  if (!destination.equals(nullAddress)) {
    let destBalance = getOrCreateERC20Balance(destination, tokenAddress, event, true)
    destBalance.balance = destBalance.balance.plus(amount)
    destBalance.modifiedAt = event.block.timestamp
    destBalance.modifiedAtBlock = event.block.number
    destBalance.modifiedAtTransaction = event.transaction.hash
    destBalance.save()
  } else {
    // Burn
    erc20.totalSupply = erc20.totalSupply.minus(amount)
  }

  // Check if it's not a mint before updating source
  if (!source.equals(nullAddress)) {
    let srcBalance = getOrCreateERC20Balance(source, tokenAddress, event, false)
    srcBalance.balance = srcBalance.balance.minus(amount)
    srcBalance.modifiedAt = event.block.timestamp
    srcBalance.modifiedAtBlock = event.block.number
    srcBalance.modifiedAtTransaction = event.transaction.hash
    srcBalance.save()
  } else {
    // Mint
    erc20.totalSupply = erc20.totalSupply.plus(amount)
  }

  erc20.save()

  // Deduct the allowance
  // If this transfer is a transferFrom we need deduct the allowance by the amount of the transfer.
  // Updating the allowance is highly problematic because we don't have access to msg.sender who is
  // the allowed address. We sync the allowance assuming msg.sender is the destination (a contract pulling
  // funds) but it might not always be the case and therefore the allowance will be wrong. But it should work
  // in most cases.

  updateAllowance(tokenAddress, destination, source, event)

  // Sync these assuming msg.sender is the contract emitting the event or tx originator
  updateAllowance(tokenAddress, event.address, source, event)
  updateAllowance(tokenAddress, event.transaction.from, source, event)

  // Create a transfer object
  let transfer = new ERC20Transfer(eventUid(event))
  transfer.tokenAddress = tokenAddress
  transfer.source = source
  transfer.destination = destination
  transfer.amount = amount
  transfer.createdAt = event.block.timestamp
  transfer.createdAtBlock = event.block.number
  transfer.createdAtTransaction = event.transaction.hash
  transfer.save()
}

export function handleApproval(event: Approval): void {
  let tokenAddress = dataSource.address()
  let allowance = getOrCreateERC20BAllowance(
    event.params.src,
    tokenAddress,
    event.params.guy,
    event,
  )
  allowance.amount = decimal.fromWad(event.params.amount)
  allowance.modifiedAt = event.block.timestamp
  allowance.modifiedAtBlock = event.block.number
  allowance.modifiedAtTransaction = event.transaction.hash
  allowance.save()
}
