import { Timeline } from "./timeline.js";
import { ChannelChart } from "./channel.js";
import { Streamgraph } from "./streamgraph.js";
// import { slider_snap } from "./slider.js";

const FOLDER = '../data/discord/prepared/'
const FILES = [
    'stacked daily activity.csv',
    'stacked weekly activity.csv'
]
const TL_FILE = 'combined activitiy.csv'
const STREAM_FILE = '../data/stream/streams.csv'

const SELECTOR_CHANNEL_ID = '#channel_select';
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
        }).then(data => {
            let stream_list = [];
            data.forEach(stream => {
                if (stream_list.length == 0) {
                    stream_list.push({
                        topic: stream['Stream'],
                        selected: false,
                        streams: [{
                            start: stream['Date'],
                            end: new Date(stream['Date'].getTime() + stream['Duration'])
                        }]
                    });
                } else {
                    if (stream_list[stream_list.length - 1].topic == stream['Stream']) {
                        stream_list[stream_list.length - 1].streams.push({
                            start: stream['Date'],
                            end: new Date(stream['Date'].getTime() + stream['Duration'])
                        });
                    } else {
                        stream_list.push({
                            topic: stream['Stream'],
                            selected: false,
                            streams: [{
                                start: stream['Date'],
                                end: new Date(stream['Date'].getTime() + stream['Duration'])
                            }]
                        });
                    }
                }
            });
            
            const click = function(d, i) {
                if (i.selected) {
                    i.selected = false;
                    d3.select(this).style('background-color', '#000');
                    d3.select(this).style('color', '#fff');
                } else {
                    i.selected = true;
                    d3.select(this).style('background-color', '#fff');
                    d3.select(this).style('color', '#000');
                }
                channel_chart.s_list = stream_list;
                streamgraph.s_list = stream_list;
                channel_chart.highlightStream();
                streamgraph.highlightStream();
                
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

                    channel_chart.s_list = stream_list;
                    streamgraph.s_list = stream_list;
                    channel_chart.highlightStream();
                    streamgraph.highlightStream();
                });
            let everything_button = d3.select(STREAM_SELECTION_ID).append('button')
                .attr('class', 'button stream-button')
                .html('select everything')
                .style('background-color', '#000')
                .style('color', '#fff')
                .style('opacity', .87)
                .on('click', (d, i) => {
                    stream_list.forEach(stream => {
                        stream.selected = true;
                    });
                    button_group.selectAll('button')
                        .style('background-color', '#fff')
                        .style('color', '#000');

                    channel_chart.s_list = stream_list;
                    streamgraph.s_list = stream_list;
                    channel_chart.highlightStream();
                    streamgraph.highlightStream();
                });
            let button_group = d3.select(STREAM_SELECTION_ID)
                .append('div')
                .style('height', '600px');
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
            
        }).catch((error) => {
            console.log(error);
        });

    }).catch((error) => {
        console.log(error);
    });
    
}).catch((error) => {
    console.log(error);
});