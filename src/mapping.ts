import { near, JSONValue, json, ipfs, TypedMap, store } from "@graphprotocol/graph-ts"
import {Token, Account, TokenMetadata, Fractionation, Sale} from "../generated/schema"
import { log } from '@graphprotocol/graph-ts'

export function handleReceipt(
  receipt: near.ReceiptWithOutcome
): void {
  const actions = receipt.receipt.actions;
  for (let i = 0; i < actions.length; i++) {
    handleAction(actions[i], receipt)
  }
}

function parseEvent(logData: string): TypedMap<string, JSONValue> {
  let outcomeLog = logData.toString();

  log.info('outcomeLog {}', [outcomeLog]);

  let parsed = outcomeLog.replace('EVENT_JSON:', '');

  let jsonData = json.try_fromString(parsed);
  const jsonObject = jsonData.value.toObject();

  return jsonObject;
}

function handleAction(
  action: near.ActionValue,
  receiptWithOutcome: near.ReceiptWithOutcome
): void {
  if (action.kind != near.ActionKind.FUNCTION_CALL) {
    return;
  }

  const outcome = receiptWithOutcome.outcome;
  // const functionCall = action.toFunctionCall();
  const ipfsHash = 'bafybeiew2l6admor2lx6vnfdaevuuenzgeyrpfle56yrgse4u6nnkwrfeu'
  // const methodName = functionCall.methodName

  for (let logIndex = 0; logIndex < outcome.logs.length; logIndex++) {
      const ev = parseEvent(outcome.logs[logIndex]);
      const eventData = ev.get("data");
      const eventMethod = ev.get("event");

      if (!eventData || !eventMethod) {
        continue;
      }

      const data = eventData.toObject();
      const method = eventMethod.toString();

      if (method == "nft_create") {
        const rawToken = data.get('token');

        if (!rawToken) {
          log.error("[nft_create] - invalid args", []);
          return;
        }
        const tokenData = rawToken.toObject();

        const tokenId = tokenData.get('token_id')
        const ownerId = tokenData.get('owner_id');
        const metadata = tokenData.get('metadata');

        const collection = tokenData.get('collection');
        const tokenType = tokenData.get('token_type');
        const rarity = tokenData.get('rarity');
        const saleId = tokenData.get('sale_id');
        const bindToOwner = tokenData.get('bind_to_owner');
        const locked = tokenData.get('locked');
        const fractionationId = tokenData.get('fractionation_id');

        if (!tokenId || !ownerId) {
          log.error("[nft_create] - invalid token args", []);
          continue;
        }
        if (saleId) {
          const sale = Sale.load(saleId.toString());

          if (!sale) {
            log.error("[nft_create] - not found sale {}", [saleId.toString()]);
            continue;
          }}

        const token = new Token(tokenId.toString());

        token.tokenId = tokenId.toString();
        token.ownerId = ownerId.toString();
        token.owner = ownerId.toString();
        token.collection = collection ? collection.toString() : null;
        token.tokenType = tokenType ? tokenType.toString() : null;
        token.rarity = rarity ? rarity.toString() : null;
        token.saleId = saleId ? saleId.toString() : null;
        token.bindToOwner = bindToOwner ? bindToOwner.toBool() : false;
        token.locked = locked ? locked.toBool() : false;
        token.fractionationId = fractionationId ? fractionationId.toString() : null;

        token.sale = saleId ? saleId.toString() : null;
        token.fractionation = fractionationId ? fractionationId.toString() : null

        if (metadata) {
          const metaObj = metadata.toObject();
          const tokenMetadata = new TokenMetadata(tokenId.toString());
          const metaTitle = metaObj.get("title");
          const metaDescription = metaObj.get("description");
          const metaMedia = metaObj.get("media");

          tokenMetadata.tokenId = tokenId.toString();
          tokenMetadata.token = tokenId.toString();
          tokenMetadata.title = metaTitle ? metaTitle.toString() : null;
          tokenMetadata.decsription = metaDescription ? metaDescription.toString() : null;
          tokenMetadata.media = metaMedia ? metaMedia.toString() : null;

          token.metadata = tokenId.toString();
        }

        let account = Account.load(ownerId.toString());
        if (!account) {
          account = new Account(ownerId.toString());
        }

        account.tokens.push(token.tokenId);

        token.save();
        account.save();
      } else if (method == "nft_transfer") {
        const tokenId = data.get('token_id');
        const senderId = data.get('sender_id');
        const receiverId = data.get('receiver_id');

        if (!tokenId || !senderId || !receiverId) {
          log.error("[nft_transfer] - invalid args", []);
          continue;
        }

        let token = Token.load(tokenId.toString());
        if (!token) {
          log.error("[nft_transfer] - Not found transferred token {}", [tokenId.toString()]);
          continue;
        }

        token.owner = receiverId.toString();
        token.ownerId = receiverId.toString();

        let sender = Account.load(senderId.toString())
        if (!sender) {
          sender = new Account(senderId.toString())
        }

        let receiver = Account.load(receiverId.toString())
        if (!receiver) {
          receiver = new Account(receiverId.toString())
        }

        sender.save();
        receiver.save();
      } else if (method == "nft_burn") {
        const tokenId = data.get('token_id');
        // const senderId = data.get('sender_id');

        if (!tokenId) {
          log.error("[nft_burn] - invalid args", [])
          continue;
        }

        let token = Token.load(tokenId.toString());
        if (!token) {
          log.error("[nft_burn] - Not found token {}", [tokenId.toString()]);
          continue;
        }

        store.remove("Token", tokenId.toString());
      } else if (method == "nft_fractionation_create") {
        const tokenId = data.get('token_id');

        if (!tokenId) {
          log.error("[nft_fractionation_create] - invalid args", [])
          continue;
        }

        let token = Token.load(tokenId.toString());
        if (!token) {
          log.error("[nft_fractionation_create] - Not found token {}", [tokenId.toString()]);
          continue;
        }

        token.fractionationId = tokenId.toString();

        const fractionation = new Fractionation(tokenId.toString());

        fractionation.tokenId = tokenId.toString();

        token.save();
        fractionation.save();
      } else if (method == "nft_fractionation_add_token") {
        const tokenId = data.get('token_id');
        const fractionationId = data.get('fractionation_id');

        if (!tokenId || !fractionationId) {
          log.error("[nft_fractionation_add_token] - invalid args", []);
          continue;
        }

        let fractionationToken = Token.load(fractionationId.toString());
        let token = Token.load(tokenId.toString());
        let fractionation = Fractionation.load(fractionationId.toString());

        if (!fractionationToken) {
          log.error("[nft_fractionation_create] - Not found fractionation token {}", [fractionationId.toString()]);
          continue;
        }
        if (!token) {
          log.error("[nft_fractionation_create] - Not found fractionation part {}", [tokenId.toString()]);
          continue;
        }
        if (!fractionation) {
          log.error("[nft_fractionation_create] - Not found fractionation {}", [fractionationId.toString()]);
          continue;
        }

        token.fractionationId = fractionationId.toString();

        token.save();
      } else if (method == "nft_fractionation_complete") {
        const tokenId = data.get('token_id');
        const from = data.get('from');
        const to = data.get('to');

        if (!from || !to || !tokenId) {
          log.error("[nft_fractionation_complete] - invalid args", []);
          continue;
        }

        let token = Token.load(tokenId.toString());
        let fractionation = Fractionation.load(tokenId.toString());

        if (!token) {
          log.error("[nft_fractionation_complete] - Not found fractionation token {}", [tokenId.toString()]);
          continue;
        }
        if (!fractionation) {
          log.error("[nft_fractionation_complete] - Not found fractionation {}", [tokenId.toString()]);
          continue;
        }

        token.ownerId = to.toString();

        fractionation.tokens.forEach(function (partId) {
          store.remove("Token", partId.toString());
        });
        token.save();
      } else if (method == "nft_on_lock") {
        const tokenId = data.get('token_id');
        const locked = data.get('locked');

        if (!tokenId) {
          log.error("[nft_on_lock] - invalid args", []);
          continue;
        }

        let token = Token.load(tokenId.toString());

        if (!token) {
          log.error("[nft_on_lock] - Not found token {}", [tokenId.toString()]);
          continue;
        }

        token.locked = locked ? locked.toBool() : false;

        token.save();
      } else if (method == "nft_sale_add") {
        const rawSale = data.get('sale');

        if (!rawSale) {
          log.error("[nft_sale_id] - invalid args", []);
          continue;
        }

        const saleObj = rawSale.toObject();
        const id = saleObj.get("id");
        const name = saleObj.get("name");
        const amount = saleObj.get("amount");
        const price = saleObj.get("price");
        const buyMax = saleObj.get("buy_max");
        const perTransactionMin = saleObj.get("per_transaction_min");
        const perTransactionMax = saleObj.get("per_transaction_max");
        const notMinted = saleObj.get("not_minted");
        const locked = saleObj.get("locked");
        const startDate = saleObj.get("start_date");

        if (!id || !name || !amount || !price || !buyMax || !perTransactionMax || !perTransactionMin || !notMinted || !locked) {
          log.error("[nft_sale_id] - invalid sale args", []);
          continue;
        }

        const sale = new Sale(id.toString());

        sale.name = name.toString();
        sale.amount = amount.toU64() as i32;
        sale.price = price.toString();
        sale.buyMax = buyMax.toU64() as i32;
        sale.perTransactionMax = perTransactionMax.toU64() as i32;
        sale.perTransactionMin = perTransactionMin.toU64() as i32;
        sale.notMinted = notMinted.toU64() as i32;
        sale.locked = locked.toBool();
        sale.startDate = startDate ? startDate.toBigInt() : null;

        sale.save();
      } else if (method == "nft_sale_update") {
        const saleId = data.get('sale_id');
        const date = data.get('date');

        if (!saleId || !date) {
          log.error("[nft_sale_update] - invalid args", []);
          continue;
        }

        const sale = Sale.load(saleId.toString());

        if (!sale) {
          log.error("[nft_sale_update] - not found sale {}", [saleId.toString()]);
          continue;
        }

        sale.startDate = date.toBigInt();

        sale.save();
      } else if (method == "nft_sale_start") {
        const saleId = data.get('sale_id');
        const date = data.get('date');

        if (!saleId || !date) {
          log.error("[nft_sale_update] - invalid args", []);
          continue;
        }

        const sale = Sale.load(saleId.toString());

        if (!sale) {
          log.error("[nft_sale_start] - not found sale {}", [saleId.toString()]);
          continue;
        }

        sale.startDate = date.toBigInt();

        sale.save();
      } else if (method == "nft_mint") {
        const tokenIds = data.get('token_ids');
        const receiverId = data.get('receiver_id');
        // ignore
      } else if (method == "nft_transfer_payout") {
        const tokenId = data.get('token_id');
        const senderId = data.get('sender_id');
        const receiverId = data.get('receiver_id');
        const balance = data.get('balance');
        // ignore
      }
  }
}
