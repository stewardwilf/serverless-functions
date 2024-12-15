function parseBlocks(blocks) {
    const keyMap = {};
    const valueMap = {};
    const blockMap = {};

    blocks.forEach(block => {
        const blockId = block.Id;
        blockMap[blockId] = block;

        if (block.BlockType === "KEY_VALUE_SET") {
            if (block.EntityTypes && block.EntityTypes.includes("KEY")) {
                keyMap[blockId] = block;
            } else {
                valueMap[blockId] = block;
            }
        }
    });

    return { keyMap, valueMap, blockMap };
}

function findValueBlock(keyBlock, valueMap) {
    let valueBlock = null;
    keyBlock.Relationships?.forEach(relationship => {
        if (relationship.Type === "VALUE") {
            relationship.Ids.forEach(valueId => {
                valueBlock = valueMap[valueId];
            });
        }
    });
    return valueBlock;
}

function getText(result, blockMap) {
    let text = "";

    result.Relationships?.forEach(relationship => {
        if (relationship.Type === "CHILD") {
            relationship.Ids.forEach(childId => {
                const word = blockMap[childId];
                if (word.BlockType === "WORD") {
                    text += word.Text + " ";
                } else if (word.BlockType === "SELECTION_ELEMENT" && word.SelectionStatus === "SELECTED") {
                    text += "X ";
                }
            });
        }
    });

    return text.trim();
}

function getKeyValuePairs(keyMap, valueMap, blockMap) {
    const kvs = {};

    Object.entries(keyMap).forEach(([keyId, keyBlock]) => {
        const valueBlock = findValueBlock(keyBlock, valueMap);
        const key = getText(keyBlock, blockMap);
        const value = valueBlock ? getText(valueBlock, blockMap) : "";
        kvs[key] = value;
    });

    return kvs;
}


export const convertBlocksToKV = (blocks) => {
    const { keyMap, valueMap, blockMap } = parseBlocks(blocks);
    const kvs = getKeyValuePairs(keyMap, valueMap, blockMap);
    return kvs
}

export const findMatchingValue = (obj, pattern) => {
    // Create a regex that matches the pattern (case insensitive, can handle extra spaces, and numbers in parentheses)
    const regex = new RegExp(pattern.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/\s+/g, '\\s*'), 'i');
    
    // Loop through the keys and match the regex
    for (const key in obj) {
      if (regex.test(key)) {
        return obj[key];  // Return the value if there's a match
      }
    }
    return null;  // Return null if no match is found
}