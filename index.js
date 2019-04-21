const chalk = require('chalk');
const curl = require('curl');
const queryString = require('query-string');
const fs = require('fs');
const path = require('path');

const dataUrl = 'https://openreview.net/notes';
const params = {
    invitation: "ICLR.cc/2019/Conference/-/Blind_Submission",
    details: "replyCount",
    // 加载多少个
    limit: 10,
    // 从第多少个加载
    offset: 0,
};
const paramString = queryString.stringify(params)
const url = `${dataUrl}?${paramString}`;

console.log(chalk.yellow(`Loading:\n${url}\n\n`));

curl.get(url, params, function (e, _, body) {
    if (e) {
        console.log('error: \n', chalk.red(JSON.stringify(e)));
        return;
    }
    const { notes } = JSON.parse(body);
    const articles = notes.map(({ content = {} }) => {
        const {
            title,
            pdf: pdfUrl
        } = content;
        return {
            title,
            pdfUrl
        };
    })
    const scripts = articles.reduce((pre, cur) => {
        const {
            title,
            pdfUrl
        } = cur;
        const sh = `curl ${`https://openreview.net${pdfUrl}`} -o "${title}.pdf"\n`;
        return pre + sh;
    }, 'cd pdf\n');
    fs.writeFileSync(path.resolve(__dirname, "./temp.sh"), scripts);
});