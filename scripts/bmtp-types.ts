type BmTpCoord = {
    x: number,
    y: number,
    z: number
};

type BmTpName = string;
type BmTpCommand = "help" | "?" | BmTpName;
type BmTpLocationMap = Map<BmTpName, BmTpCoord>;

export {
    BmTpCommand, BmTpCoord, BmTpName, BmTpLocationMap
}