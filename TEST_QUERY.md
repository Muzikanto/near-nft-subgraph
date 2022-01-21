```
{
  tokens(first: 10) {
    ownerId
    tokenId
    metadata {
      title
      decsription
      media
    }
    rarity
    collection
    tokenType

    fractionationId
    saleId

    bindToOwner
    locked
  }
  accounts(first:10){
    id
    tokens{
      id
    }
  }
  sales(first:10) {
    id
    name
    price
    amount
    buyMax
    locked
    perTransactionMin
    perTransactionMax
    startDate
    notMinted
    tokens{
      id
    }
  }
  fractionations(first: 10){
    tokenId
    tokens{
      id
    }
  }
}

```
