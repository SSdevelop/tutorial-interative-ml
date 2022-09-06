d3.json('https://api.philippstuerner.com/data/linear?return_theta=true')
    .then(data => {
        // console.log(data);
        chart(data);
    })
    .catch(err => console.error(err));

function arrAvg(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function chart(data) {
    const b = data.theta0_best
    const m = data.theta1_best
    // console.log(b, m);
    // data = data.data
    let X = data.data.map(item => item.X);
    let y = data.data.map(item => item.y);
    // console.log(X);
    // console.log(y);
    let bSliderSvg = d3.select('#chart-bslider')
                         .append('svg')
                         .attr('width', '100%')
                         .attr('height', '4em');
    
    let mSliderSvg = d3.select('#chart-mslider')
                         .append('svg')
                         .attr('width', '100%')
                         .attr('height', '4em');
    
    let bSliderRect = bSliderSvg.node().getBoundingClientRect(),
        mSliderRect = mSliderSvg.node().getBoundingClientRect();

    let bSlider = d3
                    .sliderBottom()
                    .width(bSliderRect.width * 0.9)
                    .tickFormat(d3.format('.2'))
                    .ticks(5)
                    .handle(d3.symbol().type(d3.symbolCircle).size(200)())
                    .on('onchange', (val) => {
                        const node = document.getElementById('chart-bslider-math');
                        MathJax.typesetClear([node]);
                        node.innerHTML = `\\( b = ${val.toFixed(1)} \\)`
                        MathJax.typesetPromise([node]).then(() => {});
                    });
    
    let mSlider = d3
                    .sliderBottom()
                    .width(mSliderRect.width * 0.9)
                    .tickFormat(d3.format('.2'))
                    .ticks(5)
                    .handle(d3.symbol().type(d3.symbolCircle).size(200)())
                    .on('onchange', (val) => {
                        const node = document.getElementById('chart-mslider-math');
                        MathJax.typesetClear([node]);
                        node.innerHTML = `\\( m = ${val.toFixed(1)} \\)`
                        MathJax.typesetPromise([node]).then(() => {});
                    });

    let bSliderG = bSliderSvg
                    .append('g')
                    .attr(
                        'transform',
                        `translate(${bSliderRect.width * 0.05}, ${bSliderRect.height / 3})`
                    );
    
    let mSliderG = mSliderSvg
                    .append('g')
                    .attr(
                        'transform',
                        `translate(${mSliderRect.width * 0.05}, ${mSliderRect.height / 3})`
                    );
    
    bSliderG
        .call(bSlider.min(0).max(1).value(0.5))
        .attr("id", "chart-bslider");
    
    mSliderG
        .call(mSlider.min(0).max(1).value(0.5))
        .attr("id", "chart-mslider");
    
    setControls(data, m, b);

    function setControls(data, m, b) {
        let xExtent = d3.extent(data.data, (d) => d.X),
            yExtent = d3.extent(data.data, (d) => d.y);

        let mVal = Number(
            (
                Math.max(...yExtent.map(d => Math.abs(d))) /
                Math.max(...xExtent.map(d => Math.abs(d)))
            ).toFixed(1)
        );
        console.log(mVal);
        let bData = [Number(yExtent[0].toFixed(1)), Number(yExtent[1].toFixed(1))],
            mData = [-2 * mVal, 2 * mVal];

        let yMean = arrAvg(data.data.map(d => d.y)).toFixed(1),
            mMean = arrAvg(mData).toFixed(1);

        bSlider.min(d3.min(bData)).max(d3.max(bData)).value(d3.min(bData));
        bSliderG.transition().duration(1000).call(bSlider);
        mSlider.min(d3.min(mData)).max(d3.max(mData)).value(mMean);
        mSliderG.transition().duration(1000).call(mSlider);

        d3.selectAll(".chart-best-fit").on("click", function () {
            mSlider.value(data.theta1_best);
            bSlider.value(data.theta0_best);
        });

    }

    const margin = { top: 40, bottom: 40, left: 60, right: 40 },
        chartWidth =
            d3.select("#chart-graph").node().getBoundingClientRect().width -
            margin.left -
            margin.right,
        chartHeight =
            d3.select("#chart-graph").node().getBoundingClientRect().height -
            margin.top -
            margin.bottom,
        xScale = d3.scaleLinear().range([0, chartWidth]),
        yScale = d3.scaleLinear().range([chartHeight, 0]);

    const baseSvg = d3
        .select("#chart-graph")
        .append("svg")
        .attr("width", chartWidth + margin.left + margin.right)
        .attr("height", chartHeight + margin.top + margin.bottom)

    baseSvg
        .append("clipPath")
        .attr("id", "chart-scatter-clip")
        .append("rect")
        .attr("width", chartWidth + margin.left + margin.right)
        .attr("height", chartHeight);

    const svg = baseSvg
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);
    
    const residuals = svg.append("g").attr("class", "residuals"),
        scatters = svg.append("g").attr("class", "scatters"),
        lines = svg.append("g").attr("class", "lines");
    
    const xAxis = d3.axisBottom(xScale),
        xAxisDraw = svg
            .append("g")
            .attr("class", "x axis")
            .attr("transform", `translate(0, ${chartHeight})`),
        yAxis = d3.axisLeft(yScale),
        yAxisDraw = svg.append("g").attr("class", "y axis");
    
    drawChart(data.data);

    function drawChart(data) {
        const dur = 500;
        const t = d3.transition().duration(dur);
        // Update scales
        xScale.domain([0, d3.max(data, (d) => d.X)]);
        yScale.domain(d3.extent(data, (d) => d.y));

        // Update axes
        xAxisDraw.transition(t).call(xAxis.scale(xScale));
        yAxisDraw.transition(t).call(yAxis.scale(yScale));
        yAxisDraw.selectAll("text").attr("dx", "-0.6em");

        // m, b
        const m = mSlider.value();
        const b = bSlider.value();

        updateScatter();
        updateRegressionComponents(data, m, b);

        mSlider.on("onchange.chart", (val) =>
            updateRegressionComponents(data, val, bSlider.value())
        );
        bSlider.on("onchange.chart", (val) =>
            updateRegressionComponents(data, mSlider.value(), val)
        );

        function updateScatter() {
            scatters
                .selectAll(".scatter")
                .data(data)
                .join(
                    (enter) => {
                        enter
                            .append("circle")
                            .attr("class", "scatter")
                            .attr("id", (d) => `scatter-${d.i}`)
                            .attr("cy", (d) => yScale(d.y))
                            .attr("r", 5)
                            .style("fill", "dodgerblue")
                            .transition(t)
                            .attr("cx", (d) => xScale(d.X));
                    },
                    (update) => {
                        update
                            .transition(t)
                            .delay((d, i) => i * 10)
                            .attr("cx", (d) => xScale(d.X))
                            .attr("cy", (d) => yScale(d.y))
                            .attr("r", 5);
                    },
                    (exit) => {
                        exit.remove();
                    }
                );
        }

        function updateRegressionComponents(data, m, b) {
            const yPred = getPredictions(
                data.map((d) => d.X),
                m,
                b
            );
    
            

            function getPredictions(X, m, b) {
                return X.map((d) => m * d + b);
            }

            function updateResiduals() {
                const residualLines = [];
                const lineGen = d3
                    .line()
                    .x((d) => xScale(d.x))
                    .y((d) => yScale(d.y));

                data.forEach(function (d, i) {
                    residualLines.push({
                        v: [
                            { x: d.X, y: d.y },
                            { x: d.X, y: yPred[i] },
                        ],
                        i: d.i,
                    });
                });

                residuals
                    .selectAll(".residual")
                    .data(residualLines)
                    .join(
                        (enter) => {
                            enter
                                .append("path")
                                .attr("clip-path", "url(#chart-scatter-clip)")
                                .attr("class", "residual")
                                .attr("id", (d) => `residual-${d.i}`)
                                .transition()
                                .duration(2000)
                                .delay((d, i) => i * 10)
                                .attr("d", (d) => lineGen(d.v))
                                .style("fill", "none")
                                .style("stroke", "red")
                                .style("opacity", 0.5)
                                .style("stroke-width", 30)
                                .style("stroke-dasharray", "5, 5");
                        },
                        (update) => {
                            update
                                .attr("clip-path", "url(#chart-scatter-clip)")
                                .transition()
                                .duration(150)
                                .delay((d, i) => i * 5)
                                .attr("d", (d) => lineGen(d.v));
                        }
                    );
            }

            function updateLine() {
                const lineData = [
                    {
                        v: [0, d3.max(data, (d) => d.X)].map((d) => ({
                            x: d,
                            y: getPredictions([d], m, b)[0],
                        })),
                    },
                ];
                console.log(lineData);
                const lineGen = d3
                    .line()
                    .x((d) => xScale(d.x))
                    .y((d) => yScale(d.y));

                // Update regression
                lines
                    .selectAll(".line")
                    .data(lineData)
                    .join(
                        (enter) => {
                            enter
                                .append("path")
                                .attr("class", "line")
                                .attr("clip-path", "url(#chart-scatter-clip)")
                                .transition()
                                .duration(100)
                                .attr("d", (d) => lineGen(d.v))
                                .style("fill", "none")
                                .style("stroke", "black");
                        },
                        (update) => {
                            update
                                .attr("clip-path", "url(#chart-scatter-clip)")
                                .transition()
                                .duration(100)
                                .attr("d", (d) => lineGen(d.v));
                        }
                    );
            }

            function updateSSE() {
                const residualSquared = data.map((d, i) =>
                    Math.pow(d.y - yPred[i], 2)
                );

                const squaredStandardError = residualSquared.reduce((a, b) => a + b, 0);

                const nodeSSE = document.getElementById('chart-sse');
                MathJax.typesetClear([nodeSSE]);
                nodeSSE.innerHTML = `\\( \\textrm{SSE} = ${squaredStandardError.toFixed(2)} \\)`;
                MathJax.typesetPromise([nodeSSE]).then(() => {});
            }

            updateResiduals();
            updateSSE();
            updateLine();


        }

    }
    
                    
}