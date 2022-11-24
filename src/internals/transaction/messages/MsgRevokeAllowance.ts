import TransactionMsg from "./TransactionMsg";

export type MsgRevokeAllowanceValue = {
  granter: string;
  grantee: string;
};

export class MsgRevokeAllowance extends TransactionMsg<MsgRevokeAllowanceValue> {
  constructor({ granter, grantee }: { granter: string; grantee: string }) {
    super("/cosmos.feegrant.v1beta1.MsgRevokeAllowance", {
      granter,
      grantee,
    });
  }
}

export default MsgRevokeAllowance;
