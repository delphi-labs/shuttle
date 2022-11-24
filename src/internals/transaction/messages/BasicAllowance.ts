import { Coin } from "@cosmjs/stargate";
import TransactionMsg from "./TransactionMsg";

export type BasicAllowanceValue = {
  spend_limit: Coin[];
  expiration?: string;
};

export class BasicAllowance extends TransactionMsg<BasicAllowanceValue> {
  constructor({ spend_limit, expiration }: { spend_limit: Coin[]; expiration?: string }) {
    super("/cosmos.feegrant.v1beta1.BasicAllowance", {
      spend_limit,
      expiration,
    });
  }
}

export default BasicAllowance;
