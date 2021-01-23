import reader from './reader';
import { ImageData, LabelData } from "./reader";
import { NeuralNetwork } from "brain.js";
import { ReadLine, createInterface } from 'readline';

let rl: ReadLine = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'Nora> '
});

const defaultFile = {
  input: {
    prefix: {
      TRAIN: 'train',
      TEST: 't10k',
      IMAGE: 't10k',
    },
    image: '-images-idx3-ubyte',
    label: '-labels-idx1-ubyte',
    text: 'Open'
  },
  network: {
    prefix: {
      TEST: 'network',
    },
    json: '.json',
    text: 'Load'
  },
  output: {
    prefix: {
      TRAIN: 'network',
      TEST: 'stat',
    },
    json: '.json',
    text: 'Save'
  }
}

function askUserForFile(type: string, file: string): Promise<string> {
  return new Promise(resolve => {
    let def = defaultFile[type].prefix[process.env.MODE] + defaultFile[type][file];
    rl.prompt();
    rl.question(`\n${defaultFile[type].text} ${file} file: [${def}]`, pData => {
      const answer =
        pData
          .toString()
          .trim() || def;
      resolve(answer);
    });
  });
}

let imageData: ImageData;
let labelData: LabelData;

(async () => {
  const imageFile = await askUserForFile('input', 'image');
  const labelFile = await askUserForFile('input', 'label');

  let getImages = (async () => {
    try {
      imageData = await reader.ReadImageFile(imageFile);
      console.log(`number of images: ${imageData.count}, size: ${imageData.rows}x${imageData.columns}`)
    } catch (e) {
      console.log(e);
    }
  })();

  let getLabels = (async () => {
    try {
      labelData = await reader.ReadLabelFile(labelFile);
      console.log(`number of labels: ${labelData.labels.length}`);
    } catch (e) {
      console.log(e);
    }
  })();

  Promise.all([getImages, getLabels]).then(() => {
    (async () => {
      if (process.env.MODE === 'TEST') {
          await test();
        process.exit(0);
      } else if (process.env.MODE === 'IMAGE') {
        image();
      } else if (process.env.MODE === 'TRAIN') {
        await main();
        process.exit(0);
      }
    })();
  });
})();

async function main() {
  let trainingData = [];
  const number2train = labelData.labels.length;
  for (let i = 0; i < number2train; i++) {
    trainingData.push({ input: imageData.imageValues[i], output: labelData.labelValues[i] });
  }
  const net = new NeuralNetwork({ hiddenLayers: [200] });

  console.log('Training: start');
  net.train(trainingData, { log: true, logPeriod: 1 });
  console.log('Training: done');
  let trainJ = net.toJSON();
  const outputFile = await askUserForFile('output', 'json');
  await reader.WriteJson(outputFile, trainJ);
}

async function test() {
  const number2test = labelData.labels.length;
  const net = new NeuralNetwork();
  const networkFile = await askUserForFile('network', 'json');
  net.fromJSON(require(`./${networkFile}`));
  let result = new Array<boolean>();
  let correct = new Array<boolean>();
  let wrong = [];
  console.log('Testing: start');
  for (let i = 0; i < number2test; i++) {
    const output = Array.from(net.run(imageData.images[i]));
    correct.push(output.filter(x => x > output[labelData.labels[i]]).length <= 0);
    if (output[labelData.labels[i]] > 0.9) {
      result.push(true);
    } else {
      result.push(false);
      wrong.push({ id: i, expected: labelData.labels[i], actual: output });
    }
  }
  console.log('Testing: done');
  console.log();
  console.log('Number of test: ', result.length);
  console.log('Correct case(highest score): ', correct.filter(x => x).length);
  console.log('Correct case(>0.9): ', result.filter(x => x).length);
  const outputFile = await askUserForFile('output', 'json');
  await reader.WriteJson(outputFile, { 'number_of_test': result.length, 'cases_lower_than_0.9': wrong});
}

function image() {
  rl.prompt();
  rl.on('line', ans => {
    const num = parseInt(ans);
    if (num !== NaN && num >=0 && num < labelData.labels.length){
      console.log(labelData.labels[num]);
      reader.Byte2Image(imageData, num);
      console.log();
    }
    rl.prompt();
  }).on('close', () => {
    console.log('Have a nice day! Bye!');
    process.exit(0);
  });
}