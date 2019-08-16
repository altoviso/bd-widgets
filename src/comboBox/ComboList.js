
const VALUE = 0;
const TEXT = 1;
const SIFTED = 2;

export default class ComboList extends Array {
    constructor(kwargs) {
        super();
        const list = kwargs.list || [];
        if (Array.isArray(list[0])) {
            list.forEach(item => this.push([item[VALUE], `${item[TEXT]}`]));
        } else {
            list.forEach(item => this.push([item, `${item}`]));
        }

        const sift = this._sift = kwargs.sift || (kwargs.noCase && (s => s.trim().toLowerCase()));
        if (sift) {
            this.forEach(item => (item[SIFTED] = sift(item[TEXT])));
        }

        function lexicalSort(lhs, rhs) {
            if (lhs[TEXT] < rhs[TEXT]) {
                return -1;
            } else if (lhs[TEXT] > rhs[TEXT]) {
                return 1;
            } else {
                return 0;
            }
        }

        const sortFunc = this.sortFunc =
			typeof kwargs.sort === 'function' ? kwargs.sort : (kwargs.sort === false ? false : lexicalSort);
        if (sortFunc) {
            this.sort(sortFunc);
        }

        if (kwargs.default) {
            this._defaultValue = this.geByValue(kwargs.default);
            if (this._defaultValue[0] === undefined) {
                throw new Error('default value does not exist in ComboList');
            }
        }

        this._valueEq = kwargs.valueEq;
    }

    sift(text) {
        return this._sift ? this._sift(text) : text.trim();
    }

    get defaultValue() {
        return this._defaultValue || (this.length && this[0][VALUE]) || null;
    }

    getByValue(value) {
        if (this._valueEq) {
            const eq = this._valueEq;
            for (const item of this) {
                if (eq(value, item[VALUE])) return item;
            }
        } else {
            for (const item of this) {
                if (value === item[VALUE]) return item;
            }
        }
        return [undefined, undefined];
    }

    getByText(text) {
        if (this._sift) {
            text = this._sift(text.trim());
            for (const item of this) {
                if (text === item[SIFTED]) return item;
            }
        } else {
            text = text.trim();
            for (const item of this) {
                if (text === item[TEXT]) return item;
            }
        }
        return [undefined, undefined];
    }

    match(text) {
        const siftedTarget = this.sift(text);
        const siftedLength = siftedTarget.length;
        if (!siftedLength) {
            return false;
        }
        let match = false;
        if (this._sift) {
            for (const item of this) {
                if (item[SIFTED].substring(0, siftedLength) === siftedTarget) {
                    match = item;
                    break;
                }
            }
        } else {
            for (const item of this) {
                if (item[TEXT].substring(0, siftedLength) === siftedTarget) {
                    match = item;
                    break;
                }
            }
        }
        if (match) {
            match = {
                value: match[VALUE],
                text: match[TEXT],
                perfect: match[this._sift ? SIFTED : TEXT] === siftedTarget
            };
            if (!match.perfect) {
                // figure out what suffix to put on text to make it a perfect match; to understand, how this can be hard, consider SSNs:
                // Let's say the client design considers 123-45-6789 equal to 123456789 (or, even, the "-" could be any non-digit);
                // then, sifted("123-45")===sifted("123-45-")===sifted("123 45")===sifted("123.45")==="12345". Now the problem...
                // What should the suffix hint be for text="123-45" compared to "123-45-" when the actual entry of "123-45-6789" exists?!
                // Notice "123-45", "123-45-", and "123-45-6789" all have the same sifted prefix, namely "12345". For "123-45", we want
                // the hint "-6789" for "123-45-" we want the hint "6789". Here's how we proceed:
                // 1. Note that "123-45" doesn't contain any sifted characters at the end.
                // 2. Note that "123-45-" does contain sifted characters at the end ("-").
                // 3. Note that the sifted prefix "12345" of the matched value ("123-45-6789") does contain sifted characters at the end ("-").
                // THEREFORE
                // * Since [1] doesn't and [3] does, choose to include [3]'s sifted characters in the hint.
                // * Since [2] does and [3] does, prefer to user's meaningless characters and do not include [3]'s sifted characters in the hint

                // find the minimal  match[TEXT] substring which sifted value === siftedTarget
                let i = siftedLength - 1;
                const matchText = match.text;
                while (i < matchText.length) {
                    if (this.sift(matchText.substring(0, i + 1)) !== siftedTarget) {
                        break;
                    }
                    i++;
                }
                // matchText[0..i] is the minimal prefix that matches the  prefix that sifted text gives
                // matchText[i+1..length-1] is the maximal suffix that can be added to text to make a perfect match

                // find any characters after the minimal substring above that are sifted
                let j = i;
                while (j < matchText.length && this.sift(matchText.substring(0, j + 1)) === siftedTarget) j++;
                // [i+1..j] are the characters in matchText that are actually sifted out (meaningless)
                // matchText[j+1..length-1] is the minimal suffix that can be added to text to make a perfect match

                if (j > i) {
                    // there are characters in matchText that are actually sifted out after prefix that matches sifted(text)
                    // are there any such characters in text?
                    if (siftedLength < text.length && this.sift(text.substring(0, siftedLength - 1)) === siftedTarget) {
                        // there is at least one character at the end of text that would be sifted
                        // there are actually sifted out (meaningless) at the end of text
                        // BOTH text AND matchText have sifted characters between the prefixes that match and the suffixes that don't
                        // therefore...do not add matchText's sifted characters to the hint
                        match.suffix = matchText.substring(j, matchText.length);
                    } else {
                        // no meaningless characters at the end of text; therefore give the hint of everything
                        match.suffix = matchText.substring(i, matchText.length);
                    }
                } else {
                    // no meaningless characters at the end of matchText that matches the prefix that text gives
                    match.suffix = matchText.substring(i, matchText.length);
                }
            }
        }
        return match;
    }

    getListBoxParams(text) {
        const list = this.map(item => item[TEXT]);
        const match = this.match(text);
        return {list, focusedItem: match ? match.text : null};
    }
}

ComboList.VALUE = VALUE;
ComboList.TEXT = TEXT;
ComboList.SIFTED = SIFTED;
