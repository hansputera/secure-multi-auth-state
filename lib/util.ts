export const decodetoBuffer = <T extends Object>(object: T): void => {
	if(typeof object !== 'object') {
		throw new TypeError('Invalid input: ' + object)
	}

	// const regexBase64 = new RegExp(/^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/);
	for(const [key, value] of Object.entries(object)) {
		if(typeof value === 'object') {
			if('type' in value && value.type === 'Buffer') {
				Reflect.set(object, key, Buffer.from(value))
			} else {
				if(typeof value === 'object') {
					if(Array.isArray(value)) {
						for(const valueInObject of value.filter(v => typeof v === 'object')) {
							if('type' in valueInObject && valueInObject.type === 'Buffer') {
								Reflect.set(value, value.indexOf(valueInObject), Buffer.from(valueInObject))
							} else {
								decodetoBuffer(valueInObject)
							}
						}
					} else {
						decodetoBuffer(value)
					}
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