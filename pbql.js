'use strict';

/**
 * Телефонная книга
 */
const phoneBook = new Map();
const dataOfContact = {
    phones: [],
    mails: []
};

/**
 * Вызывайте эту функцию, если есть синтаксическая ошибка в запросе
 * @param {number} lineNumber – номер строки с ошибкой
 * @param {number} charNumber – номер символа, с которого запрос стал ошибочным
 */
function syntaxError(lineNumber, charNumber) {
    throw new Error(`SyntaxError: Unexpected token at ${lineNumber}:${charNumber}`);
}

/**
 * Выполнение запроса на языке pbQL
 * @param {string} query
 * @returns {string[]} - строки с результатами запроса
 */
function run(query) {
    const spl = query.split(';');
    const commands = spl.slice(0, [spl.length - 1]);
    let result = [];

    let index = 1;
    for (const command of commands) {
        if (command === '') {
            continue;
        }
        if (command.startsWith('Покажи')) {
            result = result.concat(handleCommand(command, index));
            index++;
            continue;
        }
        handleCommand(command, index);
        index++;
    }

    return handleLastCommand(spl[spl.length - 1], result, index);
}

function handleLastCommand(command, result, index) {
    if (command === '') {
        return result;
    }
    handleCommand(command, index);
    syntaxError(index, command.length + 1);
}
function handleCommand(command, index) {
    const splitCommand = command.split(' ');
    const commandFirstWord = splitCommand[0];
    switch (commandFirstWord) {
        case 'Создай':
            checkForGoodCreateContactCommand(command, index);
            createContact(command);
            break;
        case 'Удали':
            deleteCommand(command, index);
            break;
        case 'Добавь':
            modifyDataOfContact(command, index);
            break;
        case 'Покажи':
            checkSeeCommand(command, index);

            return getData(command, index);
        default:
            syntaxError(index, 1);
    }
}

function checkForGoodCreateContactCommand(command, index) {
    const commands = command.split(' ');
    if (commands[0] !== 'Создай') {
        syntaxError(index, 1);
    }
    if (commands[1] !== 'контакт') {
        syntaxError(index, 8);
    }
}

function createContact(command) {
    const spl = command.split(' ').slice(2);
    const contactName = spl.join(' ');
    if (!phoneBook.has(contactName)) {
        phoneBook.set(contactName, dataOfContact);
    }
}

function getData(command, index) {
    const commands = command.split(' ');
    const lastWord = commands.slice(commands.indexOf('есть') + 1).join(' ');
    if (lastWord === '') {
        return [];
    }
    const regexp = lastWord;
    let contacts = [];
    for (const key of phoneBook.keys()) {
        const phones = phoneBook.get(key).phones.filter(x => x.indexOf(regexp) !== -1);
        const mails = phoneBook.get(key).mails.filter(x => x.indexOf(regexp) !== -1);
        if (phones.length > 0 || mails.length > 0 || key.indexOf(regexp) >= 0) {
            contacts.push(key);
        }
    }

    return handleQueryToSee(command, index, contacts);
}

function handleQueryToSee(command, index, contacts) {
    let supportProperty = {};
    for (let i = 0; i < contacts.length; i++) {
        const contactName = contacts[i];
        const phones = phoneBook.get(contactName).phones.map(x => '+7 (' +
            x.substring(0, 3) + ') ' + x.substring(3, 6) + '-' + x.substring(6, 8) + '-' +
            x.substring(8, 10)).join(',');
        const mails = phoneBook.get(contactName).mails.join(',');
        supportProperty[i] = {
            'name': contactName,
            'phones': phones,
            'mails': mails
        };
    }

    return printResult(command, index, supportProperty);
}

function printResult(command, index, supportProperty) {
    let result = [];
    for (const key in supportProperty) {
        if (!supportProperty.hasOwnProperty(key)) {
            continue;
        }
        const resultStr = getResultStr(command, index, supportProperty[key]);
        if (resultStr.replace(';', '').length > 1) {
            result.push(resultStr.substring(0, resultStr.length - 1));
        }
    }

    return result;
}

function checkSeeCommand(command, index) {
    const commands = command.split(' ').slice(1);
    let i = 0;
    let errorIndex = 8;
    for (const c of commands) {
        i = checkWithI(i, c, index, command);
        if (i === undefined) {
            return;
        }
        if (i === -1) {
            syntaxError(index, errorIndex);
        }
        errorIndex += c.length + 1;
    }
}

function checkWithI(i, command, index, query) {
    if (i === 0 && checkCommandFirst(command)) {
        return 1;
    } else if (i === 1 && command === 'и') {
        return 0;
    }

    return checkFor(i, command, index, query);

}

function checkFor(i, command, index, query) {
    if (i === 1 && command === 'для') {
        return checkQueryAfterFor(query, index);
    }

    return -1;
}

function checkCommandFirst(command) {
    return command === 'имя' || command === 'телефоны' ||
        command === 'почты';
}

function getResultStr(command, index, property) {
    const commands = command.split(' ').slice(1);
    let commandCounter = 0;
    let resultStr = '';
    let errorIndex = 8;
    for (const com of commands) {
        commandCounter = modifyCommandCounter(commandCounter, com, property);
        if (commandCounter === -1) {
            syntaxError(index, errorIndex);
        } else if (commandCounter === 2) {
            checkQueryAfterFor(command, index);

            return resultStr;
        } else if (commandCounter !== 0) {
            resultStr += commandCounter;
            commandCounter = 1;
        }
        errorIndex += com.length + 1;
    }
}

function checkQueryAfterFor(query, index) {
    const command = query.split(' ');
    const commands = command.slice(command.indexOf('для') + 1, command.length - 1);
    let errorIndex = query.indexOf('для') + 5;
    if (commands[0] !== 'контактов,') {
        syntaxError(index, errorIndex);
    }
    if (commands[1] !== 'где') {
        syntaxError(index, errorIndex + 11);
    }
    if (commands[2] !== 'есть') {
        syntaxError(index, errorIndex + 11 + 4);
    }
}

function modifyCommandCounter(commandCounter, command, supportProperty) {
    switch (commandCounter) {
        case 0:
            return handleCommandToInfoData(command, supportProperty);
        case 1:
            if (command === 'и') {
                return 0;
            } else if (command === 'для') {
                return 2;
            }

            return -1;
        default:
            return -1;
    }
}

function handleCommandToInfoData(command, supportProperty) {
    switch (command) {
        case 'имя':
            return supportProperty.name + ';';
        case 'телефоны':
            return supportProperty.phones + ';';
        case 'почты':
            return supportProperty.mails + ';';
        default:
            return -1;
    }
}


function deleteCommand(command, lineNumber) {
    const spl = command.split(' ').slice(1);
    const secondWord = spl[0];
    switch (secondWord) {
        case 'контакт':
            checkForGoodDeleteContactCommand(command, lineNumber);
            deleteContact(command);
            break;
        case 'контакты,':
            checkDeletesContacts(command, lineNumber);
            deleteContactsForQuery(command);
            break;
        case 'телефон':
            modifyDataOfContact(command, lineNumber);
            break;
        case 'почту':
            modifyDataOfContact(command, lineNumber);
            break;
        default:
            syntaxError(lineNumber, 7);
    }
}

function checkForGoodDeleteContactCommand(command, lineNumber) {
    const commands = command.split(' ');
    if (commands[0] !== 'Удали') {
        syntaxError(lineNumber, 1);
    }
    if (commands[1] !== 'контакт') {
        syntaxError(lineNumber, 7);
    }
}
function deleteContact(command) {
    const contactName = command.split(' ').slice(2)
        .join(' ');
    if (phoneBook.has(contactName)) {
        phoneBook.delete(contactName);
    }
}

function deleteContactsForQuery(command) {
    const commands = command.split(' ');
    const lastWord = commands.slice(commands.indexOf('есть') + 1).join(' ');
    if (lastWord === '') {
        return [];
    }
    const regexp = lastWord;
    let contacts = [];
    for (const key of phoneBook.keys()) {
        const phones = phoneBook.get(key).phones.filter(x => x.indexOf(regexp) !== -1);
        const mails = phoneBook.get(key).mails.filter(x => x.indexOf(regexp) !== -1);
        if (phones.length > 0 || mails.length > 0 || key.indexOf(regexp) >= 0) {
            contacts.push(key);
        }
    }
    deleteContacts(contacts);
}

function checkDeletesContacts(command, lineNumber) {
    const commands = command.split(' ').slice(2);
    if (commands[0] !== 'где') {
        syntaxError(lineNumber, 17);
    }
    if (commands[1] !== 'есть') {
        syntaxError(lineNumber, 21);
    }

}

function deleteContacts(contacts) {
    for (const contact of contacts) {
        phoneBook.delete(contact);
    }
}

function modifyDataOfContact(command, lineNumber) {
    let splitCommand = command.split(' ');
    const isAdd = splitCommand[0] === 'Добавь';
    splitCommand = splitCommand.slice(1);
    let commandCounter = 0;
    let phones = [];
    let mails = [];
    let errorIndex = (isAdd) ? 8 : 7;
    for (const word of splitCommand) {
        if (commandCounter === 4) {
            addOrDelete(isAdd, splitCommand.slice(splitCommand.indexOf(word)).join(' '),
                phones, mails);
            commandCounter = 5;
        }
        commandCounter = handleWordModifyData(word, commandCounter, phones, mails);
        if (commandCounter === -1) {
            syntaxError(lineNumber, errorIndex);
        }
        errorIndex += word.length + 1;
    }
}

function addOrDelete(isAdd, word, phones, mails) {
    if (isAdd) {
        addPhoneAndMailsForContact(word, phones, mails);
    } else {
        deletePhoneAndMailsForContact(word, phones, mails);
    }
}

function handleWordModifyData(word, commandCounter, phones, mails) {
    switch (commandCounter) {
        case 0:
            return checkPhoneOrMail(word);
        case 1:
            return addPhoneOrMail(word, phones, mails);
        case 2:
            return checkAddOrFor(word);
        case 3:
            return checkWordContact(word);
        default:
            break;
    }
}

function checkPhoneOrMail(word) {
    if (word === 'телефон' || word === 'почту') {
        return 1;
    }

    return -1;
}

function addPhoneOrMail(word, phones, mails) {
    let w = word.replace('+', '');
    if (!isNaN(w) && word.length === 10 && !word.includes('+')) {
        phones.push(word);

        return 2;
    } else if (isNaN(w)) {
        mails.push(word);

        return 2;
    }

    return -1;
}

function checkAddOrFor(word) {
    if (word === 'и') {
        return 0;
    } else if (word === 'для') {
        return 3;
    }

    return -1;
}

function checkWordContact(word) {
    if (word === 'контакта') {
        return 4;
    }

    return -1;
}

function addPhoneAndMailsForContact(contactName, phones, mails) {
    if (!phoneBook.has(contactName)) {
        return;
    }
    let existsPhones = phoneBook.get(contactName).phones;
    let existsMails = phoneBook.get(contactName).mails;
    existsPhones = existsPhones.concat(phones);
    existsMails = existsMails.concat(mails);
    phoneBook.set(contactName, {
        phones: Array.from(new Set(existsPhones)),
        mails: Array.from(new Set(existsMails))
    });
}

function deletePhoneAndMailsForContact(contactName, phones, mails) {
    if (!phoneBook.has(contactName)) {
        return;
    }
    let existsPhones = phoneBook.get(contactName).phones;
    let existsMails = phoneBook.get(contactName).mails;
    existsPhones = existsPhones.filter(x => phones.indexOf(x) < 0);
    existsMails = existsMails.filter(x => mails.indexOf(x) < 0);
    phoneBook.set(contactName, {
        phones: Array.from(new Set(existsPhones)),
        mails: Array.from(new Set(existsMails))
    });
}
module.exports = { phoneBook, run };

// console.log(run(
//     'Создай контакт  Григорий;' +
//     'Создай контакт Василий;' +
//     'Создай контакт Иннокентий;' +
//     'Добавь телефон 5556667788 и телефон 5556667787 и почту grisha@example.com ' +
//     'для контакта  Григорий;' +
//     'Удали телефон 5556667788 и телефон 5556667785 и почту grisha2@example.com ' +
//     'для контакта  Григорий;' +
//     'Покажи почты и телефоны для контактов, где есть ий;' +
//     'Удали контакт  Григорий;'));
//
// console.log(phoneBook);
