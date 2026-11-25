const solesFmt = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", maximumFractionDigits: 0 });
const solesFmt2 = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const usdFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export const formatSoles = (value: number, decimals = false) => (decimals ? solesFmt2 : solesFmt).format(value);
export const formatUsd = (value: number) => usdFmt.format(value);
