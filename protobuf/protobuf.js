export default class ProtocolBuffer{
	static parseConfig(config){
		let parseField = f=>{
			let parts = f.split(':')
			let is_array = parts[1].charAt(0)==='['

			if(is_array)
				parts[1] = parts[1].slice(1,-1)

			let typeparts = parts[1].split('.')

			return {
				key: parts[0],
				type: typeparts[0],
				subtype: typeparts[1],
				array: is_array
			}
		}

		let populateField = f=>{
			let field = Object.assign({},f)

			switch(f.type){
				case 'enum':
					field.values = config.enums.find(e=>e.id===f.subtype).values
					field.bytes = 1
				break
				case 'struct':
					field.fields = structs.find(s=>s.id===f.subtype).fields
				break
				case 'json':
				break
				default:
					field.bytes = ProtocolBuffer.typedef[f.type].bytes
				break
			}

			return field
		}


		let structs = (config.structs || []).map(struct=>Object.assign(struct,{
			fields: struct.fields.map(f=>parseField(f))
		}))

		structs.forEach(struct=>{
			struct.fields = struct.fields.map(f=>populateField(f))
		})

		let parsed = {
			messages: {},
			buffers: config.buffers
		}

		parsed.messages.list = config.messages.map((m,i)=>Object.assign({},m,{
			fields: m.fields.map(f=>populateField(parseField(f))),
			index: i
		}))

		parsed.messages.dict = parsed.messages.list.reduce((dict,msg)=>{
			dict[msg.id] = msg
			return dict
		},{})

		return parsed
	}


	constructor(config){
		this.config = ProtocolBuffer.parseConfig(config)
		this.encode_buffer = new Uint8Array(this.config.buffers.encoder.bytes)
		this.encoder = new DataView(this.encode_buffer.buffer)
		this.decode_buffer = new Uint8Array(this.config.buffers.decoder.bytes)
		this.decoder = new DataView(this.decode_buffer.buffer)
	}

	encode(type,payload){
		let cfg = this.config.messages.dict[type]
		let len = 0

		if(!cfg){
			throw new TypeError(`Undefined message type: ${type}`)
		}

		this.writeEncodedPrimitive('uint8',0,cfg.index)
		len += 1
		len += this.encodeFields(cfg.fields,len,payload)

		return this.encode_buffer.subarray(0,len)
	}

	encodeFields(fields,offset,data){
		let count = fields.length
		let len = 0
		let data_is_array = Array.isArray(data)

		for(var i=0;i<count;i++){
			let field = fields[i]
			let value = data_is_array ? data[i] : data[field.key]

			switch(field.type){
				case 'struct':
					if(field.array){
						this.writeEncodedPrimitive('uint16',offset+len,value.length)
						len += 2

						for(var u=0;u<value.length;u++){
							len += this.encodeFields(field.fields,offset+len,value[u])
						}
					}else{
						len += this.encodeFields(field.fields,offset+len,value)
						
					}
					
				break
				case 'enum':
					this.writeEncodedPrimitive('uint8',offset+len,field.values.indexOf(value))
					len += 1
				break
				case 'json':
					value = JSON.stringify(value)
				case 'string':
					let strlen = this.writeEncodedString(offset+len+2,value)
					this.writeEncodedPrimitive('uint16',offset+len,strlen)
					len += strlen+2
				break
				case 'blob':
					let bloblen = this.writeBlob(offset+len+4,value)
					this.writeEncodedPrimitive('uint32',offset+len,bloblen)
					len += bloblen+4
				break
				default:
					this.writeEncodedPrimitive(field.type,offset+len,value)
					len += field.bytes
				break
			}
		}

		return len
	}

	writeEncodedPrimitive(type,offset,value){
		switch(type){
			case 'uint8':
				this.encoder.setUint8(offset,value)
			break
			case 'uint16':
				this.encoder.setUint16(offset,value)
			break
			case 'uint32':
				this.encoder.setUint32(offset,value)
			break
			case 'uint64':
				this.encoder.setBigUint64(offset,value)
			break
			case 'int8':
				this.encoder.setInt8(offset,value)
			break
			case 'int16':
				this.encoder.setInt16(offset,value)
			break
			case 'int32':
				this.encoder.setInt32(offset,value)
			break
			case 'int64':
				this.encoder.setBigInt64(offset,value)
			break
			case 'float32':
				this.encoder.setFloat32(offset,value)
			break
			case 'float64':
				this.encoder.setFloat64(offset,value)
			break
			case 'bool':
				this.encoder.setUint8(offset,+value)
			break
		}
	}

	writeEncodedString(offset,str){
		let len = 0

		for (var i=0; i < str.length; i++) {
			let charcode = str.charCodeAt(i)

			if (charcode < 0x80){
				this.writeEncodedPrimitive('uint8',offset+len++,charcode)
			}
			else if (charcode < 0x800) {
				this.writeEncodedPrimitive('uint8',offset+len++,0xc0 | (charcode >> 6))
				this.writeEncodedPrimitive('uint8',offset+len++,0x80 | (charcode & 0x3f))
			}
			else if (charcode < 0xd800 || charcode >= 0xe000) {
				this.writeEncodedPrimitive('uint8',offset+len++,0xe0 | (charcode >> 12))
				this.writeEncodedPrimitive('uint8',offset+len++,0x80 | ((charcode>>6) & 0x3f))
				this.writeEncodedPrimitive('uint8',offset+len++,0x80 | (charcode & 0x3f))
			}
			else {
				i++
				charcode = 0x10000 + (((charcode & 0x3ff)<<10)
						  | (str.charCodeAt(i) & 0x3ff))

				this.writeEncodedPrimitive('uint8',offset+len++,0xf0 | (charcode >>18))
				this.writeEncodedPrimitive('uint8',offset+len++,0x80 | ((charcode>>12) & 0x3f))
				this.writeEncodedPrimitive('uint8',offset+len++,0x80 | ((charcode>>6) & 0x3f))
				this.writeEncodedPrimitive('uint8',offset+len++,0x80 | (charcode & 0x3f))
			}
		}

		return len
	}

	writeBlob(offset, blob){
		this.encode_buffer.set(blob, offset)
		return blob.length
	}


	decode(buffer){
		if(buffer.length > this.config.buffers.decoder.bytes)
			return null

		let array = new Uint8Array(buffer)
		this.decode_buffer.set(array)

		let cfg = this.config.messages.list[this.decoder.getUint8(0)]

		if(!cfg)
			return null

		let data = {}
		
		try{
			this.decodeFields(cfg.fields,1,data)
		}catch{
			return null
		}

		return {
			type: cfg.id,
			payload: data
		}
	}

	decodeFields(fields,offset,data){
		let count = fields.length
		let pos = 0

		for(var i=0;i<count;i++){
			let field = fields[i]
			let value

			switch(field.type){
				case 'struct':
					if(field.array){
						let structcount = this.readEncodedPrimitive('uint16',offset+pos)
						pos += 2

						value = []

						for(var u=0;u<structcount;u++){
							let entry = {}
							pos += this.decodeFields(field.fields,offset+pos,entry)
							value.push(entry)
						}
					}else{
						value = {}
						pos += this.decodeFields(field.fields,offset+pos,value)
					}
					
				break
				case 'enum':
					value = field.values[this.readEncodedPrimitive('uint8',offset+pos)]
					pos += 1
				break
				case 'json':
				case 'string':
					let strlen = this.readEncodedPrimitive('uint16',offset+pos)
					value = this.readEncodedString(offset+pos+2,strlen)
					pos += strlen+2

					if(field.type==='json')
						value = JSON.parse(value)
				break
				case 'blob':
					let bloblen = this.readEncodedPrimitive('uint32',offset+pos)
					value = this.readBlob(offset+pos+4,bloblen)
					pos += bloblen+4
				break
				default:
					value = this.readEncodedPrimitive(field.type,offset+pos)
					pos += field.bytes
				break
			}

			data[field.key] = value
		}

		return pos
	}

	readEncodedPrimitive(type,offset){
		switch(type){
			case 'uint8':
				return this.decoder.getUint8(offset)
			case 'uint16':
				return this.decoder.getUint16(offset)
			case 'uint32':
				return this.decoder.getUint32(offset)
			case 'uint64':
				return this.decoder.getBigUint64(offset)
			case 'int8':
				return this.decoder.getInt8(offset)
			case 'int16':
				return this.decoder.getInt16(offset)
			case 'int32':
				return this.decoder.getInt32(offset)
			case 'int64':
				return this.decoder.getBigInt64(offset)
			case 'float32':
				return this.decoder.getFloat32(offset)
			case 'float64':
				return this.decoder.getFloat64(offset)
			case 'bool':
				return !!this.decoder.getUint8(offset)
		}
	}

	readEncodedString(offset,len){
		let pos = 0
		let str = ''
		let char

		while(pos<len){
			char = this.readEncodedPrimitive('uint8',offset+pos++)

			switch (char >> 4)
			{ 
				case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
					str += String.fromCharCode(char);
				break;
				case 12: case 13:
					str += String.fromCharCode(
						((char & 0x1F) << 6) 
						| (this.readEncodedPrimitive('uint8',offset+pos++) & 0x3F)
					);
				break;
				case 14:
					str += String.fromCharCode(
						((char & 0x0F) << 12) 
						| ((this.readEncodedPrimitive('uint8',offset+pos++) & 0x3F) << 6) 
						| ((this.readEncodedPrimitive('uint8',offset+pos++) & 0x3F) << 0)
					)
				break;
			}
		}

		return str
	}

	readBlob(offset,len){
		return this.decode_buffer.slice(offset, offset+len)
	}
}

ProtocolBuffer.typedef = {
	uint8: {bytes:1},
	uint16: {bytes:2},
	uint32: {bytes:4},
	uint64: {bytes:8},
	int8: {bytes:1},
	int16: {bytes:2},
	int32: {bytes:4},
	int64: {bytes:8},
	bool: {bytes:1},
	float32: {bytes:4},
	float64: {bytes:8},
	blob: {bytes:undefined},
	string: {bytes:undefined},
}