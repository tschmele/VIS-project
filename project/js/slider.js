export function tl_slider(min, max, layout, parentElement, starting_min=min, starting_max=max) {

    let range = [min, max];
    let starting_range = [starting_min, starting_max];

    let w = layout.width;
    let h = layout.height;
    let margin = layout.margin;
    
    let width = w - margin.left - margin.right;
    let height = h - margin.top - margin.bottom;
    
    let xScale = d3.scaleUtc()
        .domain(range)
        .range([0, width]);
    
    let svg = d3.select(parentElement.svg.node());
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    g.append('g').selectAll('line')
        .data(d3.range(0, 1))
        .enter()
        .append('line')
            .attr('x1', d => xScale(d))
            .attr('x2', d => xScale(d))
            .attr('y1', 0)
            .attr('y2', height)
            .style('stroke', '#ccc');

    // let label_left = g.append('text')
    //     .attr('id', 'labelleft')
    //     .attr('x', 0)
    //     .attr('y', height + 5)
    //     .text(range[0]);
    
    // let label_right = g.append('text')
    //     .attr('id', 'labelright')
    //     .attr('x', 0)
    //     .attr('y', height + 5)
    //     .text(range[1]);
    
    let brush = d3.brushX()
        .extent([[0, 0], [width, height]])
        .on('brush', e => {
            let s = e.selection;

            handle.attr('display', null)
                .attr('transform', (d, i) => `translate(${[s[i], -height / 4]})`);
            
            svg.node().value = s.map(d => (xScale.invert(d)));
            svg.node().dispatchEvent(new CustomEvent('input'));
        })
        .on('end', e => {
            if (!e.sourceEvent) return;
            let s = e.selection;
            let d0 = e.selection.map(xScale.invert);
            // let d1 = d0.map(Math.round);
            d3.select(this).transition().call(e.target.move, d0.map(xScale));
            
            parentElement.config.timeframe = {
                start: xScale.invert(s[0]),
                end: xScale.invert(s[1])
            };
            if (parentElement.data != undefined)
                parentElement.updateVis();
        });

        let gBrush = g.append('g')
            .attr('class', 'brush')
            .attr('id', 'tl_slider')
            .call(brush);
        
        //from https://bl.ocks.org/Fil/2d43867ba1f36a05459c7113c7f6f98a
        let brushResizePath = function(d) {
            let e = +(d.type == "e"),
                x = e ? 1 : -1,
                y = height / 2;
            return "M" + (.5 * x) + "," + y + "A6,6 0 0 " + e + " " + (6.5 * x) + "," + (y + 6) + "V" + (2 * y - 6) +
              "A6,6 0 0 " + e + " " + (.5 * x) + "," + (2 * y) + "Z" + "M" + (2.5 * x) + "," + (y + 8) + "V" + (2 * y - 8) +
              "M" + (4.5 * x) + "," + (y + 8) + "V" + (2 * y - 8);
        }

        let handle = gBrush.selectAll('.handle--custom')
            .data([{type: 'w'}, {type: 'e'}])
            .enter()
            .append('path')
                .attr('class', 'handle--custom')
                .attr('stroke', '#000')
                .attr('fill', '#eee')
                .attr('cursor', 'ew-resize')
                .attr('d', brushResizePath);

        // gBrush.selectAll('.overlay')
        //     .each(d => d.type = 'selection')
        //     .on('mousedown touchstart', brushcentered);
        
        // function brushcentered(e) {
        //     let dx = xScale(1) - xScale(0),
        //         cx = d3.pointer(e)[0],
        //         x0 = cx - dx,
        //         x1 = cx + dx;
            
        //     d3.select(this.parentNode).call(brush.move, x1 > width ? [width - dx, width] : x0 < 0 ? [0, dx] : [x0, x1]);
        // }

        gBrush.call(brush.move, starting_range.map(xScale));

        return svg.node();
}