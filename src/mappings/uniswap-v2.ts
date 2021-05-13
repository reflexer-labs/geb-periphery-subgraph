import { Address } from '@graphprotocol/graph-ts'
import {
  Swap,
  Sync,
  Transfer,
  Approval,
  UniswapV2Pair as UniswapPairContract,
} from '../../generated/UniCoinPool/UniswapV2Pair'
import { ERC20Transfer, UniswapV2Swap, UniswapV2Sync } from '../../generated/schema'
import {
  getOrCreateERC20,
  getOrCreateERC20Balance,
  getOrCreateERC20BAllowance,
  updateAllowance,
} from '../entities/erc20'
import { getOrCreateUniPool } from '../entities/uniswap'
import * as decimal from '../utils/decimal'
import { eventUid } from '../utils/ethereum'

// Called during a swap, update the pair reserves
export function handleSync(event: Sync): void {
  let pair = getOrCreateUniPool(event.address, event)
  pair.reserve0 = decimal.fromWad(event.params.reserve0)
  pair.reserve1 = decimal.fromWad(event.params.reserve1)

  if (pair.reserve1.notEqual(decimal.ZERO)) pair.token0Price = pair.reserve0.div(pair.reserve1)
  else pair.token0Price = decimal.ZERO
  if (pair.reserve0.notEqual(decimal.ZERO)) pair.token1Price = pair.reserve1.div(pair.reserve0)
  else pair.token1Price = decimal.ZERO

  let pairContract = UniswapPairContract.bind(event.address)
  pair.totalSupply = decimal.fromWad(pairContract.totalSupply())

  pair.modifiedAt = event.block.timestamp
  pair.modifiedAtBlock = event.block.number
  pair.modifiedAtTransaction = event.transaction.hash

  pair.save()

  // Create sync event
  let sync = new UniswapV2Sync(eventUid(event))
  sync.reserve0 = decimal.fromWad(event.params.reserve0)
  sync.reserve1 = decimal.fromWad(event.params.reserve1)
  sync.pair = event.address.toHexString()
  sync.createdAt = event.block.timestamp
  sync.createdAtBlock = event.block.number
  sync.createdAtTransaction = event.transaction.hash
  sync.save()
}

// Create a swap object
export function handleSwap(event: Swap): void {
  let swap = new UniswapV2Swap(eventUid(event))
  swap.pair = event.address.toHexString()
  swap.amount0In = decimal.fromWad(event.params.amount0In)
  swap.amount1In = decimal.fromWad(event.params.amount1In)
  swap.amount0Out = decimal.fromWad(event.params.amount0Out)
  swap.amount1Out = decimal.fromWad(event.params.amount1Out)
  swap.sender = event.params.sender
  swap.createdAt = event.block.timestamp
  swap.createdAtBlock = event.block.number
  swap.createdAtTransaction = event.transaction.hash
  swap.save()
}

// Create a transfer object
export function handleTransfer(event: Transfer): void {
  let tokenAddress = event.address

  let erc20 = getOrCreateERC20(tokenAddress)
  let source = event.params.from
  let destination = event.params.to
  let amount = decimal.fromWad(event.params.value)
  let nullAddress = Address.fromHexString('0x0000000000000000000000000000000000000000')

  // Check if it's not a burn before updating destination
  if (!destination.equals(nullAddress)) {
    let destBalance = getOrCreateERC20Balance(
      destination,
      tokenAddress,
      event,
      true,
    )
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
    let srcBalance = getOrCreateERC20Balance(
      source,
      tokenAddress,
      event,
      false,
    )
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

  updateAllowance(
    tokenAddress,
    event.transaction.from,
    source,
    event,
  )

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

// Create a approve object
export function handleApproval(event: Approval): void {
  let tokenAddress = event.address
  let allowance = getOrCreateERC20BAllowance(
    event.params.owner,
    tokenAddress,
    event.params.spender,
    event,
  )
  allowance.amount = decimal.fromWad(event.params.value)
  allowance.modifiedAt = event.block.timestamp
  allowance.modifiedAtBlock = event.block.number
  allowance.modifiedAtTransaction = event.transaction.hash
  allowance.save()
}
