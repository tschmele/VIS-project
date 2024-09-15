export class Streamgraph {

    constructor(_config) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: _config.containerWidth || 460,
            containerHeight: _config.containerHeight || 400,
            margin: {top: 20, right: 30, bottom: 0, left: 10},
            timeframe: _config.timeframe || {start: new Date(2022, 0 ,1), end: new Date(2023, 11, 31)},
            highlight: _config.highlight || None,
            interval: _config.interval || 'Weeks'
        }

        this.initVis();
    }

    initVis() {
        let vis = this;

        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;
        
        vis.svg = d3.select(vis.config.parentElement).append('svg')
            .attr('width', vis.config.containerWidth)
            .attr('height', vis.config.containerHeight);
        vis.chart = vis.svg.append('g')
            .attr('transform', `translate(${vis.config.margin.left}, ${vis.config.margin.top})`);
        
        vis.color = d3.scaleSequential(d3.interpolateMagma);

        vis.xScale = d3.scaleUtc()
            .domain([vis.config.timeframe.start, vis.config.timeframe.end])
            .range([0, vis.width]);
        
        vis.xAxis = d3.axisBottom(vis.xScale).tickSize(-vis.height*.8).ticks(8);
        
        vis.xAxisGroup = vis.chart.append('g')
            // .attr('class', 'axis x-axis')
            .attr('transform', `translate(0, ${vis.height*.85})`);
        vis.xAxisGroup.call(vis.xAxis)
            .select('.domain').remove();

        vis.chart.selectAll('.tick line').attr('fill', '#fff').style('opacity', .87);
        
        vis.chart.append('text')
            .attr('class', 'label x-axis')
            .attr('text-anchor', 'end')
            .attr('x', vis.width)
            .attr('y', vis.height-25 )
            .style('fill', '#fff')
            .style('opacity', .87)
            .text('Time');

        vis.yScale = d3.scaleLinear()
            .domain((vis.config.interval == 'Weeks') ? [-150000, 130000] : [-70000, 60000])
            // .domain([-70000, 60000])
            .range([vis.height, 0]);

        vis.Tooltip = vis.chart.append('text')
            .attr('class', 'label tooltip')
            .attr('x', 0)
            .attr('y', 0);
        
        vis.Infobox = d3.select(vis.config.parentElement).append('div')
            .attr('class', 'infobox tooltip')
            .style('position', 'absolute')
            .style('visibility', 'hidden')
            .style('border', 'solid')
            .style('border-width', '1px')
            .style('border-radius', '5px')
            .style('padding', '10px');
        
        vis.xIndicator = vis.svg.append('line')
            .attr('class', 'tooltip crosshair')
            .attr('id', 'sxIndicator')
            .style('stroke', vis.color(1))
            .attr('y1', vis.height*.85 + vis.config.margin.top)
            .attr('y2', vis.height*.05 + vis.config.margin.top)
            .attr('x1', 0)
            .attr('x2', 0);
        vis.yIndicator = vis.svg.append('line')
            .attr('class', 'tooltip crosshair')
            .attr('id', 'syIndicator')
            .style('stroke', vis.color(1))
            .attr('y1', 0)
            .attr('y2', 0)
            .attr('x1', vis.config.margin.left)
            .attr('x2', vis.width);
            
        
        // Four function that change the tooltip when user hover / move / leave / click a cell
        vis.mouseover = function(d) {
            d3.selectAll('.myArea').style('opacity', .2);
            d3.select(this)
                .style('stroke', vis.color(0))
                .style('opacity', 1);
            vis.Infobox.style('visibility', 'visible');
            vis.xIndicator.style('visibility', 'visible');
            vis.yIndicator.style('visibility', 'visible');
            d3.select('#cxIndicator').style('visibility', 'visible');
        }
        vis.mousemove = function(d,i) {
            let channel = i.key;
            let date = vis.xScale.invert(d.offsetX - vis.config.margin.left);
            let activitiy = 0;
            
            vis.Tooltip.text(channel);
            vis.xIndicator
                .attr('x1', d.offsetX)
                .attr('x2', d.offsetX);
            vis.yIndicator
                .attr('y1', d.offsetY)
                .attr('y2', d.offsetY);
            
            // console.log(d3.select('#channel').select('svg').node().getBoundingClientRect().width);
            let c_width = d3.select('#channel').select('svg').attr('width') - 80;
            
            d3.select('#cxIndicator')
                .attr('x1', (((d.offsetX - vis.config.margin.left) / (vis.width - vis.config.margin.left)) * c_width) + 50)
                .attr('x2', (((d.offsetX - vis.config.margin.left) / (vis.width - vis.config.margin.left)) * c_width) + 50);

            if (channel == vis.config.highlight) {
                vis.xIndicator.style('stroke', vis.color(0));
                vis.yIndicator.style('stroke', vis.color(0));
            } else {
                vis.xIndicator.style('stroke', vis.color(1));
                vis.yIndicator.style('stroke', vis.color(1));
            }

            i.forEach(day => {
                if (day.data.Date <= date) {
                    activitiy = day.data[channel];
                }
            });
            vis.Infobox
                .html('<p>Channel: ' + channel.split('/')[1] +'</p>' 
                    + '<p>Date: ' + date.toDateString() +'</p>' 
                    + '<p>Weekly Activity: ' + activitiy +'</p>')
                .style('top', (d.clientY + 50) + 'px')
                .style('left', (d.clientX + 50) + 'px');
        }
        vis.mouseleave = function(d) {
            vis.Tooltip.text(vis.config.highlight);
            d3.selectAll('.myArea')
                .style('opacity', d => (d.key == vis.config.highlight) ? 1 : .8)
                .style('stroke', d => (d.key == vis.config.highlight) ? vis.color(0) : 'none');
            vis.Infobox.style('visibility', 'hidden');
            vis.xIndicator.style('visibility', 'hidden');
            vis.yIndicator.style('visibility', 'hidden');
            d3.select('#cxIndicator').style('visibility', 'hidden');
        }
        vis.click = function(d, i) {
            document.getElementById('channel_select').value = i.key;
            document.getElementById('channel_select').dispatchEvent(new Event('change'));
            vis.xIndicator.style('stroke', vis.color(0));
            vis.yIndicator.style('stroke', vis.color(0));
        }

        vis.clip = vis.chart.append('defs').append('svg:clipPath')
            .attr('id', 'server_clip')
            .append('svg:rect')
                .attr('width', vis.width )
                .attr('height', vis.height )
                .attr('x', 0)
                .attr('y', 0);
        vis.display_area = vis.chart.append('g')
            .attr('clip-path', 'url(#server_clip)');

        vis.area = d3.area()
            .x(d => vis.xScale(d.data.Date) - 1)
            .y0(d => vis.yScale(d[0]))
            .y1(d => vis.yScale(d[1]))
            .curve(d3.curveStepAfter);
    }

    updateVis() {
        let vis = this;

        vis.xScale.domain([vis.config.timeframe.start, vis.config.timeframe.end]);
        vis.yScale.domain((vis.config.interval == 'Weeks') ? [-150000, 130000] : [-35000, 28000]);
        // vis.yScale.domain((vis.config.interval == 'Weeks') ? [-40000, 210000] : [-35000, 28000]);

        vis.renderVis();
    }

    renderVis() {
        let vis = this;

        vis.xAxisGroup.call(vis.xAxis)
            .select('.domain').remove();
        
        vis.chart.selectAll('.myArea').remove();

        vis.Tooltip.text(vis.config.highlight);
        vis.display_area.selectAll('mylayers')
            .data((vis.config.interval == 'Weeks') ? vis.data[0] : vis.data[1])
            .join(
                enter => enter.append('path'),
                update => update,
                exit => exit.remove
            )
                .attr('class', 'myArea')
                .style('fill', d => (d.key == vis.config.highlight) ? vis.color(1) : ((vis.config.interval == 'Weeks') ? vis.color((d.index / vis.data[0].length) * (.9 - .1) + .1) : vis.color(((vis.data[0].length - d.index) / vis.data[0].length) * (.9 - .1) + .1)))
                .attr('d', vis.area)
                .style('opacity', d => (d.key == vis.config.highlight) ? 1 : .8)
                .style('stroke', d => (d.key == vis.config.highlight) ? vis.color(0) : 'none')
                .on('mouseover', vis.mouseover)
                .on('mousemove', vis.mousemove)
                .on('mouseleave', vis.mouseleave)
                .on('click', vis.click);
        
        if (vis.s_list != undefined) { vis.highlightStream(); }
    }

    highlightStream() {
        let vis = this;

        vis.display_area.selectAll('.stream-highlight').remove();

        let streams = [];
        vis.s_list.forEach(stream => {
            if (stream.selected) {
                streams.push(stream.streams);
            }
        });

        streams.forEach(topic => {
            vis.display_area.append('path')
                .attr('class', 'path area stream-highlight tooltip')
                .attr('d', d3.area()
                    .x(d => vis.xScale(d.start))
                    .y1(vis.height*.05)
                    .y0(vis.height*.85)(topic));
        });
    }
}