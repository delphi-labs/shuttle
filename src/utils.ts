export function defaultBech32Config(
  mainPrefix = "cosmos",
  validatorPrefix = "val",
  consensusPrefix = "cons",
  publicPrefix = "pub",
  operatorPrefix = "oper",
) {
  return {
    bech32PrefixAccAddr: mainPrefix,
    bech32PrefixAccPub: mainPrefix + publicPrefix,
    bech32PrefixValAddr: mainPrefix + validatorPrefix + operatorPrefix,
    bech32PrefixValPub: mainPrefix + validatorPrefix + operatorPrefix + publicPrefix,
    bech32PrefixConsAddr: mainPrefix + validatorPrefix + consensusPrefix,
    bech32PrefixConsPub: mainPrefix + validatorPrefix + consensusPrefix + publicPrefix,
  };
}

export function nonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}
