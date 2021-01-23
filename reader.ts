import {FileHandle, open, writeFile} from 'fs/promises';

class ImageData{
  count: number;
  rows: number;
  columns: number;
  images: Array<Uint8Array>;
  imageValues: Array<Array<number>>;
  constructor() {
    this.images = new Array<Uint8Array>();
    this.imageValues = new Array<Array<number>>();
  }
}
class LabelData {
  labels: Array<number>;
  labelValues: Array<Array<number>>;
  constructor() {
    this.labels = new Array<number>();
    this.labelValues = new Array<Array<number>>();
  }
}

class Reader{
  ReadImageFile = async function(fileName:string) {
    let filehandle: FileHandle;
    let result = new ImageData();
    try {
      let buffer= Buffer.alloc(4);
      filehandle = await open(fileName, 'r');
      await filehandle.read(buffer, 0, 4);
      await filehandle.read(buffer, 0, 4);
      let count = buffer.readUIntBE(0, 4);
      await filehandle.read(buffer, 0, 4);
      let rows = buffer.readUIntBE(0, 4);
      await filehandle.read(buffer, 0, 4);
      let columns = buffer.readUIntBE(0, 4);

      result.count = count;
      result.rows = rows;
      result.columns = columns;

      let pBuffer = Buffer.alloc(rows * columns);
      let images = Array<Uint8Array>(count);
      let imageVal = Array<Array<number>>(count);
      for (let i = 0; i < count; i++) {
        await filehandle.read(pBuffer, 0, rows * columns);
        images[i] = Uint8Array.from(pBuffer);
        imageVal[i] = Array.from(images[i]).map(x => x / 255.0);
        if ((i+1) % 1000 === 0) console.log(`Image Reader: read ${i+1} rows of data.`)
      }
      result.images = images;
      result.imageValues = imageVal;
      return result;
    } finally {
      if (filehandle !== undefined)
        await filehandle.close();
    }
  }
  ReadLabelFile = async function (fileName: string) {
    let filehandle: FileHandle;
    let result = new LabelData();
    try {
      let buffer = Buffer.alloc(4);
      filehandle = await open(fileName, 'r');
      await filehandle.read(buffer, 0, 4);
      await filehandle.read(buffer, 0, 4);
      let count = buffer.readUIntBE(0, 4);

      let pBuffer = Buffer.alloc(1);
      let labels = Array<number>(count);
      let labelVal = Array<Array<number>>(count);
      for (let i = 0; i < count; i++) {
        await filehandle.read(pBuffer, 0, 1);
        labels[i] = pBuffer.readUIntBE(0, 1);
        labelVal[i] = Array(10).fill(0);
        labelVal[i][labels[i]] = 1;
        if ((i+1) % 1000 === 0) console.log(`Label Reader: read ${i+1} row of data.`)
      }
      result.labels = labels;
      result.labelValues = labelVal;
      return result;
    } finally {
      if (filehandle !== undefined)
        await filehandle.close();
    }
  }
  Byte2Image = function (data: ImageData, index: number){
    let line = Array(data.rows).fill('═', 0, data.rows).join('');
    let a = '╔' + line + '╗' +'\n';
    for (let x = 0; x < data.rows; x++) {
      a += '║';
      for (let y = 0; y < data.columns; y++) {
        let p = data.images[index][x * data.rows + y];
        a += (p > 192) ? '▓' : (p > 128) ? '▒' : (p > 64) ? '░' : ' ';
      }
      a += '║\n';
    }
    a += '╚' + line + '╝';
    console.log(a);
  }
  WriteJson = async function (file:string, json: object) {
    try {
      await writeFile(file, JSON.stringify(json));
    } catch(e){
      console.log(e);
    }
  }
}
export default new Reader();
export {ImageData, LabelData};
