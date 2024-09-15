import { Timeline } from "./timeline.js";
import { ChannelChart } from "./channel.js";
import { Streamgraph } from "./streamgraph.js";
import { Matrix } from "./matrix.js";
// import { slider_snap } from "./slider.js";

const FOLDER = '../data/discord/prepared/'
const FILES = [
    'stacked daily activity.csv',
    'stacked weekly activity.csv'
]
const TL_FILE = 'combined activitiy.csv'
const STREAM_FILE = '../data/stream/streams.csv'
const MATRIX_FOLDER = '../data/discord/matrix-data/'

const SELECTOR_CHANNEL_ID = '#channel_select';
const SELECTOR_MATRIX_ID = '#matrix_select';
const CHANNEL_ID = '#channel';
const TIMELINE_ID = '#timeline';
const STREAMGRAPH_ID = '#streamgraph';

const STREAM_SELECTION_ID = '#stream_selection';
const MATRIX_ID = '#matrix';

const START = new Date(2022, 0, 1);
const END = new Date(2023, 11, 31);
const DAYS = d3.utcDay.range(START, END);
const WEEKS = d3.utcWeek.range(START, END);
const MONTHS = d3.utcMonth.range(START, END);

function open_file(location) {
    return d3.csv(location);
}

/**
 * function to set up the selector for channel chart
 * @param {[]} keys
 * set of values to be sorted into selector
 * 
 * currently only works for keys formatted as 'optgroup/option'
 * @param {object} c 
 * should be html element with id="channel"
 * 
 * @returns {object} 
 * label - contains a reference to the <label> element
 * 
 * selector - contains the actual selector
 */
function create_selector(keys, c) {
    const label = c.append('label')
        .attr('class', 'label')
        .attr('for', 'channel_select')
        .text('activity in channel: ');
    const selector = c.append('select')
        .attr('name', 'channels')
        .attr('id', 'channel_select');
    let categories = [];
    keys.forEach(key => {
        let file_name = key.split('/');
        let category = file_name[0];
        let channel_name = file_name[1];

        let optgroup = categories.find(c => c.attr('label') == category);
        if (optgroup == undefined) {
            categories.push(selector.append('optgroup')
                .attr('label', category));
            
            categories[categories.length-1].append('option')
                .attr('value', key)
                .text(channel_name);
        } else {
            optgroup.append('option')
                .attr('value', key)
                .text(channel_name);
        }
    });
    return {label: label, selector: selector};
}

/**
 * read in the pre-formatted daily activity file for timeline
 */
d3.csv(FOLDER+TL_FILE, d => {
    return {
        Date: d3.utcParse("%Y-%m-%d %H:%M:%S%Z")(d.Date),
        Activity: +d.Activity
    }
})
.then((data) => {
    let t_data = data;
    /**
     * create timeline
     * data pre-formatted with activity per day
     */
    let timeline_BBox = d3.select(TIMELINE_ID).node().getBoundingClientRect();
    const timeline = new Timeline({
        parentElement: TIMELINE_ID,
        containerWidth: timeline_BBox.width,
        timeframe: {start: START, end: END}
    });
    timeline.data = t_data;
    timeline.updateVis();

    /**
     * in theory: 
     * load all other files 
     * create "empty" graphs for ss and cc
     * add the data to those graphs
    */
    Promise.all(Array.from(FILES, f => open_file(FOLDER+f)))
    .then((data) => {
        data.forEach(file => {
            file.forEach(element => {
                element.Date = d3.utcParse("%Y-%m-%d %H:%M:%S%Z")(element.Date)
                for (const col in element) {
                    if (col != 'Date')
                        element[col] =  +element[col];
                }
            });
        });
        let keys = data[0].columns.slice(1);
        
        /**
         * create empty visualizations
        */
        let channel = d3.select(CHANNEL_ID);
        let channel_BBox = channel.node().getBoundingClientRect();
        const channel_selector = create_selector(keys, channel);
        const channel_chart = new ChannelChart({
            parentElement: CHANNEL_ID,
            containerWidth: channel_BBox.width,
            containerHeight: 400,
            timeframe: {start: START, end: END},
            keys: keys
        });
        d3.select(SELECTOR_CHANNEL_ID).node().value = channel_chart.config.col;
        let sgraph = d3.select(STREAMGRAPH_ID);
        let sgraph_BBox = sgraph.node().getBoundingClientRect();
        const streamgraph = new Streamgraph({
            parentElement: STREAMGRAPH_ID,
            containerWidth: sgraph_BBox.width,
            containerHeight: channel.node().getBoundingClientRect().height,
            timeframe: {start: START, end: END},
            highlight: d3.select(SELECTOR_CHANNEL_ID).node().value
        });

        /**
         * format the bins for channel chart
         * d_bins => daily bins
         * w_bins => weekly bins
         */
        let d_bins = d3.bin()
            .value(d => d.Date)
            .thresholds(DAYS)(data[0]);
        d_bins[d_bins.length - 1].x1 = END;
        d_bins.push(d_bins[d_bins.length - 1]);
        d_bins[d_bins.length - 1].x0 = END;
        let w_bins = d3.bin()
            .value(d => d.Date)
            .thresholds(WEEKS)(data[1]);
        w_bins[w_bins.length - 1].x1 = END;
        w_bins.push(w_bins[w_bins.length - 1]);
        w_bins[w_bins.length - 1].x0 = END;

        channel_chart.data = w_bins;

        /**
         * add event listener to update cc and ss on selector change
         */
        d3.select(SELECTOR_CHANNEL_ID).node().addEventListener('change', function() {
            channel_chart.config.col = this.value;
            streamgraph.config.highlight = this.value;
            channel_chart.updateVis();
            streamgraph.updateVis();
        });

        // // alternative set of keys to exclude dragons-den from server streamgraph
        // let mod_keys = data[0].columns.slice(1);
        // mod_keys.splice(mod_keys.indexOf('MAIN/dragons-den'), 1);

        /**
         * format the stacks for server streamgraph
         * d_stacks => daily values
         * w_stacks => weekly values
         */
        let w_stacks = d3.stack()
            .order(d3.stackOrderInsideOut)
            .offset(d3.stackOffsetSilhouette)
            .keys(keys)
            (data[1]);
        let d_stacks = d3.stack()
            .order(d3.stackOrderInsideOut)
            .offset(d3.stackOffsetSilhouette)
            .keys(keys)
            (data[0]);

        streamgraph.data = [w_stacks, d_stacks];
        streamgraph.config.interval = 'Weeks';
        if (streamgraph.config.interval == 'Weeks') {
            keys.sort((a, b) => {
                let x = 0,
                    y = 0;
                w_stacks.forEach(e => {
                    if (e.key == a) { x = e.index; }
                    else if (e.key == b) { y = e.index; }
                });
                if (x < y) { return -1; }
                if (x > y) { return 1; }
                return 0;
            });
        } else {
            keys.sort((a, b) => {
                let x = 0,
                    y = 0;
                d_stacks.forEach(e => {
                    if (e.key == a) { x = e.index; }
                    else if (e.key == b) { y = e.index; }
                });
                if (x < y) { return -1; }
                if (x > y) { return 1; }
                return 0;
            });
        }
        channel_chart.config.keys = keys;

        /**
         * add event listener for adjusting the range of the timeline
         * updates both other visualizations
         */
        timeline.svg.node().addEventListener('rendered', e => {
            let tframe = e.detail.tframe
            channel_chart.config.timeframe = tframe;
            streamgraph.config.timeframe = tframe;

            channel_chart.updateVis();
            streamgraph.updateVis();
        });
        
        streamgraph.updateVis();
        channel_chart.updateVis();

        /**
         * TODO anything stream data related
         */
        d3.csv(STREAM_FILE, d => {
            return {
                Stream: d.Stream,
                Date: d3.utcParse('%Y-%m-%dT%H:%M:%S.%L%Z')(d.Date),
                Duration: +d.Duration
            }
        })
        .then(data => {
            let stream_list = [];
            data.forEach(stream => {
                if (stream_list.length == 0) {
                    stream_list.push({
                        topic: stream['Stream'].replace(/:/g, ' -'),
                        selected: false,
                        streams: [{
                            start: stream['Date'],
                            end: new Date(stream['Date'].getTime() + stream['Duration'])
                        }]
                    });
                } else {
                    if (stream_list[stream_list.length - 1].topic == stream['Stream'].replace(/:/g, ' -')) {
                        stream_list[stream_list.length - 1].streams.push({
                            start: stream['Date'],
                            end: new Date(stream['Date'].getTime() + stream['Duration'])
                        });
                    } else {
                        stream_list.push({
                            topic: stream['Stream'].replace(/:/g, ' -'),
                            selected: false,
                            streams: [{
                                start: stream['Date'],
                                end: new Date(stream['Date'].getTime() + stream['Duration'])
                            }]
                        });
                    }
                }
            });

            /**
             * set up matrix selector
             * set up stream buttons
             */
            let matrix_categories = [];
            
            let matrix_label = d3.select(MATRIX_ID).append('label')
                .attr('class', 'label')
                .attr('for', 'matrix_select')
                .text('select stream date: ');
            const matrix_selector = d3.select(MATRIX_ID).append('select')
                .attr('name', 'streams')
                .attr('id', 'matrix_select');
            
            const click = function(d, i) {
                if (i.selected) {
                    i.selected = false;
                    d3.select(this).style('background-color', '#000');
                    d3.select(this).style('color', '#fff');
                    matrix_categories.splice(matrix_categories.indexOf(matrix_categories.find(c => c.attr('label') == i.topic)), 1);
                    d3.select(SELECTOR_MATRIX_ID).selectAll('optgroup').select(function(d) {return (this.label == i.topic) ? this : null}).remove();
                    if (matrix_categories.length > 0) {
                        d3.select(SELECTOR_MATRIX_ID).node().dispatchEvent(new Event('change'));
                    }
                } else {
                    i.selected = true;
                    d3.select(this).style('background-color', '#fff');
                    d3.select(this).style('color', '#000');
                    let first = (matrix_categories.length > 0) ? false : true;
                    if (!matrix_categories.find(c => c.attr('label') == i.topic)) {
                        matrix_categories.push(d3.select(SELECTOR_MATRIX_ID).append('optgroup')
                            .attr('label', i.topic));
                        i.streams.forEach(s => {
                            matrix_categories[matrix_categories.length - 1].append('option')
                                .attr('value', i.topic + ' ' + i.streams.indexOf(s))
                                .text(d3.utcFormat('%Y-%m-%d %H:%M:%S')(s.start) + ' - ' + i.topic + ' ' + i.streams.indexOf(s));
                        });
                    }
                    if (first) {
                        d3.select(SELECTOR_MATRIX_ID).node().dispatchEvent(new Event('change'));
                    }
                }
                
                channel_chart.s_list = stream_list;
                streamgraph.s_list = stream_list;
                timeline.s_list = stream_list;
                channel_chart.highlightStream();
                streamgraph.highlightStream();
                timeline.highlightStream();
                
            }

            let stream_label = d3.select(STREAM_SELECTION_ID).append('span')
                .attr('class', 'label')
                .text('select stream topics to highlight: ');
            let reset_button = d3.select(STREAM_SELECTION_ID).append('button')
                .attr('class', 'button stream-button')
                .html('reset everything')
                .style('background-color', '#000')
                .style('color', '#fff')
                .style('opacity', .87)
                .on('click', (d, i) => {
                    stream_list.forEach(stream => {
                        stream.selected = false;
                    });
                    button_group.selectAll('button')
                        .style('background-color', '#000')
                        .style('color', '#fff');
                    
                    matrix_categories = [];
                    d3.select(SELECTOR_MATRIX_ID).selectAll('optgroup').remove();

                    channel_chart.s_list = stream_list;
                    streamgraph.s_list = stream_list;
                    timeline.s_list = stream_list;
                    channel_chart.highlightStream();
                    streamgraph.highlightStream();
                    timeline.highlightStream();
                });
            let everything_button = d3.select(STREAM_SELECTION_ID).append('button')
                .attr('class', 'button stream-button')
                .html('select everything')
                .style('background-color', '#000')
                .style('color', '#fff')
                .style('opacity', .87)
                .on('click', (d, i) => {
                    let first = (matrix_categories.length > 0) ? false : true;
                    stream_list.forEach(stream => {
                        stream.selected = true;
                        if (!matrix_categories.find(c => c.attr('label') == stream.topic)) {
                            matrix_categories.push(d3.select(SELECTOR_MATRIX_ID).append('optgroup')
                                .attr('label', stream.topic));
                            stream.streams.forEach(s => {
                                matrix_categories[matrix_categories.length - 1].append('option')
                                    .attr('value', stream.topic + ' ' + stream.streams.indexOf(s))
                                    .text(d3.utcFormat('%Y-%m-%d %H:%M:%S')(s.start) + ' - ' + stream.topic + ' ' + stream.streams.indexOf(s));
                            });
                        }
                    });
                    button_group.selectAll('button')
                        .style('background-color', '#fff')
                        .style('color', '#000');
                    
                    if (first) {
                        d3.select(SELECTOR_MATRIX_ID).node().dispatchEvent(new Event('change'));
                    }

                    channel_chart.s_list = stream_list;
                    streamgraph.s_list = stream_list;
                    timeline.s_list = stream_list;
                    channel_chart.highlightStream();
                    streamgraph.highlightStream();
                    timeline.highlightStream();
                });
            let button_group = d3.select(STREAM_SELECTION_ID)
                .append('div');
            button_group.selectAll('button')
                .data(stream_list)
                .enter()
                .append('button')
                    .attr('class', 'button stream-button')
                    .text(d => d.topic)
                    .style('background-color', '#000')
                    .style('color', '#fff')
                    .style('opacity', .87)
                    .on('click', click);

            /**
             * start of matrix code
             * create matrix , load files as needed ?
             */
            let matrix_BBox = d3.select(MATRIX_ID).node().getBoundingClientRect();
            let matrix = new Matrix({
                parentElement: MATRIX_ID,
                containerWidth: matrix_BBox.width,
                containerHeight: 300
            });

            d3.select(SELECTOR_MATRIX_ID).node().addEventListener('change', function() {
                d3.csv(MATRIX_FOLDER + this.value + '.csv', d => {
                    return {
                        t0: d3.utcParse("%Y-%m-%d %H:%M:%S%Z")(d.t0),
                        t1: d3.utcParse("%Y-%m-%d %H:%M:%S%Z")(d.t1),
                        c1: d.c1,
                        c2: d.c2,
                        sum: +d.sum
                    }
                })
                .then(data => {
                    let m_data = {
                        dimensions: [],
                        channels: [],
                        data: data
                    };
    
                    let start = d3.min(data.map(row => row['t0']));
                    let end = d3.max(data.map(row => row['t1']));
                    m_data.dimensions = d3.utcHour.range(start, d3.utcHour.offset(end, 1));
                    
                    m_data.channels = [...new Set(data.map(row => row['c1']).concat(data.map(row => row['c2'])))];
                    m_data.channels.sort((a, b) => {
                        return ('' + a).localeCompare(b);
                    });
                    
                    m_data.labels = m_data.channels.map(c => c.split('/')[1]);
                    
                    matrix.data = m_data;
                    matrix.updateVis();
    
                }).catch((error) => {
                    console.log(error);
                });
            });

            
        }).catch((error) => {
            console.log(error);
        });

    }).catch((error) => {
        console.log(error);
    });
    
}).catch((error) => {
    console.log(error);
});