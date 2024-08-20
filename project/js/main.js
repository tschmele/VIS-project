// fix with node:fs later
const folder = '../data/discord/'
const files = [
    // 'MAIN - dragons-den [666328861985865749].csv',
    'MAIN - general [666328804372906040].csv',
    'MAIN - cringe-cafe [666328839114326026].csv',
    'MAIN - mental-health [666328887759994891].csv',
    'MAIN - share-stuff-you-made [666328917237563419].csv',
    'archived stream spoiler chats - 13-sentinels-spoiler-chat [1088233424092942406].csv',
    'archived stream spoiler chats - armored-core-spoiler-garage [1145038500534702120].csv',
    'archived stream spoiler chats - botwtotk-shrine-spoiler [1102673766837919844].csv',
    'archived stream spoiler chats - call-me-al-somnium-spoiler [1061323799619969134].csv',
    'archived stream spoiler chats - dp-spoiler-chat-on-jads [1082723283700551880].csv',
    'archived stream spoiler chats - ff16-spoilers [1121474497099337821].csv',
    'archived stream spoiler chats - ghost-trick-spoilers [1128723347300175953].csv',
    'archived stream spoiler chats - inscryption-spoiler-deck [1143546861387522048].csv',
    'archived stream spoiler chats - lis-true-colors-spoilers [1052997665610285137].csv',
    'archived stream spoiler chats - outer-wilds-spoiler-chat [746004186155450458].csv',
    'archived stream spoiler chats - rabiribi-spoiler-burrow-for-some-reason [1130898595512586261].csv',
    'archived stream spoiler chats - staaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaahfield-spoiler-den [1146903148972216332].csv',
    'archived stream spoiler chats - va11-hall-of-spoilers [1179100150191370371].csv',
    'archived stream spoiler chats - you-can-call-me-ai-2-spoiler-chat [1134163920769273906].csv',
    'archived stream spoiler chats - zero-escape-spoiler-chan [974341120198844467].csv',
    'dragons-den - 9 rows 9 columns 9 boxes [1055403674798653450].csv',
    'dragons-den - AI Somnium Files 2 spoiler den [989780272067264525].csv',
    'dragons-den - baldurs gate 3 goty den [1173841759890051093].csv',
    'dragons-den - Elden Ring Pen Shadow of the Nerd Tree (Spoilers Must be Marked) [945882707785826375].csv',
    'dragons-den - evolve idol [1116437039706026105].csv',
    'dragons-den - game jam dvd [1138496234982748251].csv',
    'dragons-den - GoW Raggyrock spoiler Den [1039499797729648680].csv',
    'dragons-den - Guilty Gear Den [874780655093944330].csv',
    'dragons-den - Jenshin Den [870694886746230804].csv',
    'dragons-den - roguelike den [1127095969348071545].csv',
    'Important - announcements [309158436392796161].csv',
    'Important - stream-announcements [392451461650448385].csv',
    'Stream Stuff - jadseya-awards-2023 [1178740821168766976].csv',
    'Stream Stuff - stream-art-museum [484604584174813184].csv'
]

const margin = {top: 20, right: 30, bottom: 30, left: 40};
const chart = d3.select('#chart');

const start = new Date(2022, 0, 1);
const end = new Date(2023, 11, 31);
const days = d3.utcDay.range(start, end);
const weeks = d3.utcWeek.range(start, end);
const months = d3.utcMonth.range(start, end);

function open_file(address) {
    return d3.csv(address, d => {
        return {
            Author: d.Author,
            Date: d3.utcParse("%Y-%m-%dT%H:%M:%S.%L0000%Z")(d.Date),
            Reactions: +d.Reactions
        }
    });
}

Promise.all(Array.from(files, f => open_file(folder+f)))
.then((data) => {

    console.log('all files loaded');
    
    // create bins
    // let bin = d3.bin()
    //     .value(d => d.Date)
    //     .thresholds(days);
    
    let bins = [];

    data.forEach(file => {
        bins.push(d3.bin()
        .value(d => d.Date)
        .thresholds(days)(file));
    });

    // console.log(bins);

    let all_bins = bins[0];

    bins.forEach(bin => {
        if (bin == bins[0]) return;

        all_bins.forEach(b => {
            if (b.x0 == bin.x0 || (b.x0 < bin.x0 && bin.x0 < b.x1)) {
                bin.forEach(msg => {
                    b.push(msg);
                });
            }
        });
    });
    
    console.log('all files binned and combined');
    
    
    // gen_bins.forEach(bin => {
    //     let activity = 0
    //     bin.forEach(msg => {
    //         activity = activity + msg.Reactions + 1;
    //     });
    //     if (activity >= 10000) {
    //         console.log(bin);
    //     }
    //     bins.push({
    //         size: activity,
    //         x0: bin.x0,
    //         x1: bin.x1
    //     });
    // });

    // ann_bins.forEach(bin => {
    //     bins.forEach(b => {
    //         if (b.x0 == bin.x0 || (b.x0 < bins.x0 && bin.x0 < b.x1)) {
    //             bin.forEach(msg => {
    //                 b.size = b.size + msg.Reactions + 1;
    //             });
    //         }
    //     });
    // });        

    // set up histogram
    let width = 1200 - margin.left - margin.right;
    let height = 100 - margin.top - margin.bottom;
    
    let svg = chart.append('svg')
        .attr('width', 1200)
        .attr('height', 100);
    let histogram = svg.append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

    let xScale = d3.scaleUtc()
        .range([0, width])
        .domain([start, end]);

    let yScale = d3.scaleLinear()
        .range([height, 0])
        .domain([0, d3.max(all_bins, d => d.length)]);

    let xAxis = d3.axisBottom(xScale)
        .tickSize(0)
        .ticks(8);

    let xAxisGroup = histogram.append('g')
        .attr('class', 'axis x-axis')
        .attr('transform', `translate(0, ${height})`);
    
    let yAxisGroup = histogram.append('g')
        .attr('class', 'axis y-axis');

    // draw chart
    xAxisGroup.call(xAxis)
    .selectAll('text')
        .attr('transform', `translate(20, 5)`);

    let bars = histogram.selectAll('rect')
        .data(all_bins)
        .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', 1)
            .attr('transform', d => `translate(${xScale(d.x0)}, ${yScale(d.length)})`)
            .attr('height', d => height - yScale(d.length))
            .attr('width', d => xScale(d.x1) - xScale(d.x0) - 1)

    }).catch((error) => {
        console.log(error);
    });