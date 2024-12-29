export enum ChatColor {
  Black = '\u00A70',
  DarkBlue = '\u00A71',
  DarkGreen = '\u00A72',
  DarkAqua = '\u00A73',
  DarkRed = '\u00A74',
  DarkPurple = '\u00A75',
  Gold = '\u00A76',
  Gray = '\u00A77',
  DarkGray = '\u00A78',
  Blue = '\u00A79',
  Green = '\u00A7a',
  Aqua = '\u00A7b',
  Red = '\u00A7c',
  LightPurple = '\u00A7d',
  Yellow = '\u00A7e',
  White = '\u00A7f',
  MinecoinGold = '\u00A7g'
};

export class ColoredString {
  _sep: string = '';
  _defaultColor: ChatColor = ChatColor.White;
  _value: string = '';
  constructor(sep: string, defaultColor: ChatColor) {
    this._sep = sep;
    this._defaultColor = defaultColor;
  }

  value() {
    return this._value;
  }

  toggleColor(color: ChatColor) {
    this._value += color;
    return this;
  }

  colored(color: ChatColor, text: string) {
    this._value += (color + this._sep + text + this._defaultColor);
    return this;
  }

  text(text: string) {
    this._value += (this._sep + text);
    return this;
  }

  resetColor() {
    this._value += this._defaultColor;
    return this;
  }
}