const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');
let cnt = 0;
const ids = ['day1-lunch', 'day1-dinner', 'day1-snack', 'day2-breakfast', 'day2-lunch', 'day2-dinner', 'day2-snack', 'day3-breakfast', 'day3-lunch', 'day3-dinner', 'day3-snack'];
c = c.replace(/<div class="meal-card-img" style="background-image: url\('([^']+)'\);"><\/div>/g, (m, img) => {
    // The very first one (day1-breakfast) was successfully replaced by multi_replace_file_content earlier!
    // Wait, let's verify if day1-breakfast already has an ID.
    if (m.includes('id="')) return m;
    const res = `<div class="meal-card-img" id="${ids[cnt]}-img" style="background-image: url('${img}');"></div>`;
    cnt++;
    return res;
});
fs.writeFileSync('index.html', c);
console.log('Replaced ' + cnt + ' items');
