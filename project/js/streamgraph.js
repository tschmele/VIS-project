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
            .attr('height', vis.config.containerHeight)
        vis.chart = vis.svg.append('g')
            .attr('transform', `translate(${vis.config.margin.left}, ${vis.config.margin.top})`);
        
        vis.xScale = d3.scaleUtc()
            .domain([vis.config.timeframe.start, vis.config.timeframe.end])
            .range([0, vis.width]);
        
        vis.xAxis = d3.axisBottom(vis.xScale).tickSize(-vis.height*.8).ticks(8);
        
        vis.xAxisGroup = vis.chart.append('g')
            // .attr('class', 'axis x-axis')
            .attr('transform', `translate(0, ${vis.height*.85})`);
        vis.xAxisGroup.call(vis.xAxis)
            .select('.domain').remove();

        vis.chart.selectAll('.tick line').attr('stroke', '#b8b8b8')
        
        vis.chart.append('text')
            .attr('class', 'label x-axis')
            .attr('text-anchor', 'end')
            .attr('x', vis.width)
            .attr('y', vis.height-25 )
            // .style('color', '#fff')
            .text('Time (year)')

        vis.yScale = d3.scaleLinear()
            .domain((vis.config.interval == 'Weeks') ? [-150000, 130000] : [-70000, 60000])
            // .domain([-70000, 60000])
            .range([vis.height, 0]);

        vis.color = d3.scaleSequential(d3.interpolateMagma);

        vis.Tooltip = vis.chart.append('text')
            .attr('class', 'label')
            .attr('x', 0)
            .attr('y', 0)
            .style('opacity', 1)
            .style('font-size', 16)
        
        // Three function that change the tooltip when user hover / move / leave a cell
        vis.mouseover = function(d) {
            d3.selectAll('.myArea').style('opacity', .2)
            d3.select(this)
                .style('stroke', 'black')
                .style('opacity', 1)
        }
        vis.mousemove = function(d,i) {
            vis.Tooltip.text(i.key)
        }
        vis.mouseleave = function(d) {
            vis.Tooltip.text(vis.config.highlight)
            d3.selectAll('.myArea').style('opacity', 1).style('stroke', 'none')
        }
        vis.click = function(d, i) {
            document.getElementById('channel_select').value = i.key;
            document.getElementById('channel_select').dispatchEvent(new Event('change'));
        }

        vis.clip = vis.chart.append("defs").append("svg:clipPath")
            .attr("id", "server_clip")
            .append("svg:rect")
                .attr("width", vis.width )
                .attr("height", vis.height )
                .attr("x", 0)
                .attr("y", 0);
        vis.display_area = vis.chart.append('g')
            .attr("clip-path", "url(#server_clip)");

        vis.area = d3.area()
            .x(d => vis.xScale(d.data.Date))
            .y0(d => vis.yScale(d[0]))
            .y1(d => vis.yScale(d[1]))
            .curve(d3.curveMonotoneX);
    }

    updateVis() {
        let vis = this;

        vis.xScale.domain([vis.config.timeframe.start, vis.config.timeframe.end]);
        vis.yScale.domain((vis.config.interval == 'Weeks') ? [-150000, 130000] : [-35000, 28000]);

        vis.renderVis();
    }

    renderVis() {
        let vis = this;

        vis.xAxisGroup.call(vis.xAxis)
            .select('.domain').remove();
        
        vis.chart.selectAll('.myArea').remove();

        vis.Tooltip.text(vis.config.highlight)
        vis.display_area.selectAll('mylayers')
            .data((vis.config.interval == 'Weeks') ? vis.data[0] : vis.data[1])
            .join(
                enter => enter.append('path'),
                update => update,
                exit => exit.remove
            )
                .attr('class', 'myArea')
                .style('fill', d => (d.key == vis.config.highlight) ? vis.color(.75) : vis.color(.5))
                .attr('d', vis.area)
                .on('mouseover', vis.mouseover)
                .on('mousemove', vis.mousemove)
                .on('mouseleave', vis.mouseleave)
                .on('click', vis.click);
    }
}