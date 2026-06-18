export type PriceCondition =
  | { kind: 'above'; value: number }
  | { kind: 'below'; value: number }
  | { kind: 'cross'; value: number };

export function evaluatePrice(cond: PriceCondition, price: number, prevPrice: number | undefined): boolean {
  switch (cond.kind) {
    case 'above': return price > cond.value;
    case 'below': return price < cond.value;
    case 'cross':
      if (prevPrice === undefined) return false;
      return (prevPrice <= cond.value && price > cond.value) ||
             (prevPrice >= cond.value && price < cond.value);
  }
}
