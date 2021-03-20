
const tf = require('@tensorflow/tfjs');

const BUFFER_SIZE = 100;
var word_map = {};
var words_encountered = 0;

var index = 0;
var training_data = {
    messages: [],
    labels: []
};

function getNextMessage() {return training_data.messages[index]};
function getNextLabel() {return training_data.labels[index]};

function mapWordToInteger(word) {
    if (word_map[word] == undefined) {
        word_map[word] = words_encountered;
        words_encountered++;
    }
    return word_map[word];
}

function* data() {
    for (let i = 0; i < BUFFER_SIZE; i++) {
        var data_vector = [];
        const message = getNextMessage();
        if (message === undefined) {
            throw new Error("ERROR: Cannot train, no new data available")
        }
        for (const [key, value] of Object.entries(message)) {
            data_vector.push(mapWordToInteger(key));
            data_vector.push(mapWordToInteger(value));
        }
        yield tf.tensor(data_vector);
    }
}

function* labels() {
    for (let i = 0; i < BUFFER_SIZE; i++) {
        var label_vector = [];
        const label = getNextLabel();
        if (label === undefined) {
            throw new Error("ERROR: Cannot train, no new data available")
        }
        label_vector.push(label);
        yield tf.tensor(label_vector);
    }
}

function trainModel(model) {
    try {
        const data = tf.data.generator(data);
        const labels = tf.data.generator(labels);
        index += BUFFER_SIZE;
    
        const ds = tf.data.zip({xs, ys}).shuffle(BUFFER_SIZE).batch(32);
    
        model.fitDataset(batch, {epochs: 10}).then(info => {
            console.log('Accuracy', info.history.acc);
        });
    }
    catch (error) {
        console.log(error.stack);
        return;
    }

}

function createModel() {
    const model = tf.sequential({
        layers: [
            tf.layers.embedding({
                inputDim: VOCAB_SIZE,
                outputDim: 64,
                maskZero: true
            }),
            tf.layers.bidirectional({
                layer: tf.layers.lstm({units: 64})
            }),
            tf.layers.dense({
                units: 64,
                activation: 'relu'
            }),
            tf.layers.dense({units: 1})
        ]
    });

    model.compile({
        loss: 'categoricalCrossentropy',
        optimizer: 'adam',
        metrics: ['accuracy']
    });
 
    return model;
}
