export class ChannelChart {

    constructor(_config) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: _config.containerWidth || 500,
            containerHeight: _config.containerHeight || 300,
            margin: {top: 20, right: 30, bottom: 30, left: 50},
            timeframe: _config.timeframe || {start: new Date(2022, 0 ,1), end: new Date(2023, 11, 31)},
            col: _config.col || 'MAIN/general',
            keys: _config.keys
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
        
        vis.xScale = d3.scaleUtc()
            .range([0, vis.width])
            .domain([vis.config.timeframe.start, vis.config.timeframe.end]);
        vis.yScale = d3.scaleLinear()
            .range([vis.height, 0]);
        
        vis.xAxis = d3.axisBottom(vis.xScale)
            .tickSize(5)
            .tickSizeOuter(0)
            .ticks(9);
        vis.yAxis = d3.axisLeft(vis.yScale)
            .tickSize(5)
            .ticks(10);

        vis.color = d3.scaleSequential(d3.interpolateMagma);
        
        vis.clip = vis.chart.append("defs").append("svg:clipPath")
            .attr("id", "channel_clip")
            .append("svg:rect")
                .attr("width", vis.width )
                .attr("height", vis.height )
                .attr("x", 0)
                .attr("y", 0);
        vis.display_area = vis.chart.append('g')
            .attr("clip-path", "url(#channel_clip)");

        vis.area = d3.area()
            .x(d => vis.xScale(d.x0) + 1)
            .y1(d => vis.yScale(d[0][vis.config.col]))
            .y0(vis.height)
            .curve(d3.curveStepAfter);
        
        vis.xAxisGroup = vis.chart.append('g')
            .attr('class', 'axis x-axis')
            .attr('transform', `translate(0, ${vis.height})`);
        vis.yAxisGroup = vis.chart.append('g')
            .attr('class', 'axis y-axis');
        
        vis.chart.selectAll('.axis')
            .style('color', '#fff')
            .style('opacity', .87);
            
        vis.xAxisGroup.call(vis.xAxis)
            .selectAll('text')
            .attr('transform', `translate(0, 5)`);
        
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
            .attr('id', 'cxIndicator')
            .style('stroke', vis.color(0))
            .attr('y1', vis.height + vis.config.margin.top)
            .attr('y2', 0 + vis.config.margin.top)
            .attr('x1', 0)
            .attr('x2', 0);
        vis.yIndicator = vis.svg.append('line')
            .attr('class', 'tooltip crosshair')
            .attr('id', 'cyIndicator')
            .style('stroke', vis.color(0))
            .attr('y1', 0)
            .attr('y2', 0)
            .attr('x1', vis.config.margin.left)
            .attr('x2', vis.width + vis.config.margin.left);

        // Three function that change the tooltip when user hover / move / leave a cell
        vis.mouseover = function(d) {
            vis.Infobox.style('visibility', 'visible');
            vis.xIndicator.style('visibility', 'visible');
            vis.yIndicator.style('visibility', 'visible');
            d3.select('#sxIndicator').style('visibility', 'visible');
        }
        vis.mousemove = function(d) {
            let channel = vis.config.col;
            let date = vis.xScale.invert(d.offsetX - vis.config.margin.left);
            let activitiy = 0;
            
            vis.xIndicator
                .attr('x1', d.offsetX)
                .attr('x2', d.offsetX);
            vis.yIndicator
                .attr('y1', d.offsetY)
                .attr('y2', d.offsetY);
            
                let c_width = d3.select('#streamgraph').select('svg').attr('width') - 40;
            
                d3.select('#sxIndicator')
                    .attr('x1', (((d.offsetX - vis.config.margin.left) / vis.width) * c_width) + 10)
                    .attr('x2', (((d.offsetX - vis.config.margin.left) / vis.width) * c_width) + 10);

            vis.data.forEach(d => {
                if (d.x0 <= date && date < d.x1) {
                    activitiy = d[0][channel];

                }
            })
            vis.Infobox
                .html('<p>Channel: ' + channel.split('/')[1] +'</p>' 
                    + '<p>Date: ' + date.toDateString() +'</p>' 
                    + '<p>Weekly Activity: ' + activitiy +'</p>')
                .style('top', (d.clientY - 200) + 'px')
                .style('left', (d.clientX + 40) + 'px');
        }
        vis.mouseleave = function(d) {
            vis.Infobox.style('visibility', 'hidden');
            vis.xIndicator.style('visibility', 'hidden');
            vis.yIndicator.style('visibility', 'hidden');
            d3.select('#sxIndicator').style('visibility', 'hidden');
        }
    }

    updateVis() {
        let vis = this;

        vis.xScale.domain([vis.config.timeframe.start, vis.config.timeframe.end]);
        vis.yScale.domain([0, d3.max(vis.data, d => d[0][vis.config.col])])

        vis.renderVis();
    }

    renderVis() {
        let vis = this;

        vis.yAxisGroup.call(vis.yAxis);
        vis.xAxisGroup.call(vis.xAxis)
            .selectAll('text')
            .attr('transform', `translate(0, 5)`);

        vis.display_area.selectAll('.cArea')
            .remove();

        vis.display_area.append('path')
            .attr('class', 'path cArea')
            // .style('fill', vis.color((vis.config.keys.indexOf(vis.config.col) / vis.config.keys.length) * (.9 - .1) + .1))
            .attr('d', vis.area(vis.data))
            .style('fill', vis.color(1))
            .style('stroke', vis.color(0))
            .on('mouseover', vis.mouseover)
            .on('mousemove', vis.mousemove)
            .on('mouseleave', vis.mouseleave);
        
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
                    .y1(0)
                    .y0(vis.height)(topic));
        });
    }
}