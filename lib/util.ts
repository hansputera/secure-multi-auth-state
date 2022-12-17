export const decodetoBuffer = <T extends Object>(object: T): void => {
	if(typeof object !== 'object' || Array.isArray(object)) {
		throw new TypeError('Invalid input')
	}

	// const regexBase64 = new RegExp(/^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/);
	for(const [key, value] of Object.entries(object)) {
		if(typeof value === 'object') {
			if('type' in value && value.type === 'Buffer') {
				Reflect.set(object, key, Buffer.from(value))
			} else {
				if(Array.isArray(value) || typeof value !== 'object') {
					continue
				} else {
					decodetoBuffer(value)
				}
			}
		}
		// else if (typeof value === 'string' && regexBase64.test(value))
		// {
		//     Reflect.set(object, key, Buffer.from(value, 'base64'));
		// }
	}

	return
}