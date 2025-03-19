const sheetURL =
  "https://docs.google.com/spreadsheets/d/1RrgLJ5nfgdJ2AzKRaDhOqeIcsLBO0G1W9g7Lj0Z0W5Q/gviz/tq?tqx=out:csv";

d3.csv(sheetURL).then((data) => {
  console.log("✅ Raw Data Loaded:", data);

  data = data.map((d) => ({
    "Mã đơn hàng": d["Mã đơn hàng"].trim(),
    "Thời gian tạo đơn": d["Thời gian tạo đơn"].trim(),
    "Mã mặt hàng": d["Mã mặt hàng"].trim(),
    "Tên mặt hàng": d["Tên mặt hàng"].trim(),
    "Mã nhóm hàng": d["Mã nhóm hàng"].trim(),
    "Tên nhóm hàng": d["Tên nhóm hàng"].trim(),
    "Thành tiền": +d["Thành tiền"],
    month: new Date(d["Thời gian tạo đơn"]).getMonth() + 1,
    group: `[${d["Mã nhóm hàng"]}] ${d["Tên nhóm hàng"]}`,
    order: d["Mã đơn hàng"].trim(),
    day: new Date(d["Thời gian tạo đơn"]).toLocaleDateString("en-US", {
      weekday: "long",
    }),
  }));

  console.log("✅ Processed Data:", data);

  // Q1
  let itemSales = d3.rollup(
    data,
    (v) => d3.sum(v, (d) => d["Thành tiền"]),
    (d) => `${d["Mã mặt hàng"]} - ${d["Tên mặt hàng"]}`
  );
  itemSales = Array.from(itemSales, ([key, value]) => ({
    item: key,       
    revenue: value,
  }));
  itemSales.sort((a, b) => b.revenue - a.revenue);
  console.log("✅ Item Sales Data:", itemSales);

  // Q2
  let groupSales = d3.rollup(
    data,
    (v) => d3.sum(v, (d) => d["Thành tiền"]),
    (d) => `${d["Mã nhóm hàng"]} - ${d["Tên nhóm hàng"]}`
  );
  groupSales = Array.from(groupSales, ([key, value]) => ({
    group: key,
    revenue: value,
  }));
  groupSales.sort((a, b) => b.revenue - a.revenue);
  console.log("✅ Group Sales Data:", groupSales);

  // Q3
  let monthSales = d3.rollup(
    data,
    (v) => d3.sum(v, (d) => d["Thành tiền"]),
    (d) => {
      let date = new Date(d["Thời gian tạo đơn"]);
      return isNaN(date) ? "Unknown" : date.getMonth() + 1;
    }
  );
  monthSales = Array.from(monthSales, ([month, value]) => ({
    month,
    revenue: value,
  }));
  
  monthSales = monthSales.filter((d) => d.month !== "Unknown");
  monthSales.sort((a, b) => a.month - b.month);
  console.log("✅ Month Sales Data:", monthSales);

  // Q4
  const thuMap = {
    0: "Thứ 2",
    1: "Thứ 3",
    2: "Thứ 4",
    3: "Thứ 5",
    4: "Thứ 6",
    5: "Thứ 7",
    6: "CN"
  };

  data.forEach(d => {
    const date = new Date(d["Thời gian tạo đơn"]);
    d["Thu"] = thuMap[date.getDay()];
    d["Ngày/Tháng/Năm"] = date.toLocaleDateString("vi-VN");
  });

  let groupedDataByThu = d3.group(data, d => d["Thu"]);

  let avgSalesData = Array.from(groupedDataByThu, ([thu, orders]) => {
    let uniqueDates = new Set(orders.map(o => o["Ngày/Tháng/Năm"])).size; 
    let totalRevenue = d3.sum(orders, o => o["Thành tiền"]); 
    return {
      day: thu,
      revenue: uniqueDates ? totalRevenue / uniqueDates : 0 
    };
  });

  const dayOrder = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN"];
  avgSalesData.sort((a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day));

  console.log(avgSalesData);
  
  // Q5

  let groupedDataByDayOfMonth = d3.group(data, d => new Date(d["Thời gian tạo đơn"]).getDate());

  let avgSalesDataByDayOfMonth = Array.from(groupedDataByDayOfMonth, ([day, orders]) => {
    let uniqueDates = new Set(orders.map(o => o["Ngày/Tháng/Năm"])).size; 
    let totalRevenue = d3.sum(orders, o => o["Thành tiền"]); 
    return {
      day: day,
      revenue: uniqueDates ? totalRevenue / uniqueDates : 0 
    };
  });

  avgSalesDataByDayOfMonth.sort((a, b) => a.day - b.day);

  console.log("✅ Average Sales Data by Day of Month:", avgSalesDataByDayOfMonth);

  //Q6
  let groupedDataByHour = d3.group(data, d => new Date(d["Thời gian tạo đơn"]).getHours());

  let avgSalesDataByHour = Array.from(groupedDataByHour, ([hour, orders]) => {
    let uniqueDates = new Set(orders.map(o => o["Ngày/Tháng/Năm"])).size; 
    let totalRevenue = d3.sum(orders, o => o["Thành tiền"]); 
    return {
      hour: `${String(hour).padStart(2, '0')}:00-${String(hour).padStart(2, '0')}:59`, 
      revenue: uniqueDates ? totalRevenue / uniqueDates : 0 
    };
  });

  avgSalesDataByHour.sort((a, b) => a.hour.localeCompare(b.hour));

  console.log("✅ Average Sales Data by Hour:", avgSalesDataByHour);

  // Q7
  let totalOrders = new Set(data.map((d) => d["Mã đơn hàng"])).size;
  let groupOrderCount = d3.rollup(
    data,
    (v) => new Set(v.map((d) => d["Mã đơn hàng"])).size, 
    (d) => `${d["Mã nhóm hàng"]} - ${d["Tên nhóm hàng"]}`
  );

  let groupOrderProb = Array.from(groupOrderCount, ([key, value]) => ({
    group: key,
    probability: value / totalOrders,
  }));
  groupOrderProb.sort((a, b) => b.probability - a.probability);
  console.log("✅ Group Order Probability Data:", groupOrderProb);

  // Q8
  data = data.filter((d) => !isNaN(d.month));

  let totalOrdersPerMonth = d3.rollup(
    data,
    (v) => new Set(v.map((d) => d.order)).size,
    (d) => d.month
  );

  let groupOrdersPerMonth = d3.rollup(
    data,
    (v) => new Set(v.map((d) => d.order)).size,
    (d) => d.month,
    (d) => d.group
  );

  let formattedData = [];
  groupOrdersPerMonth.forEach((groups, month) => {
    groups.forEach((count, group) => {
      formattedData.push({
        month: `T${month}`,
        group,
        probability: count / (totalOrdersPerMonth.get(month) || 1),
      });
    });
  });

  // Q9
  let totalOrdersByGroup = d3.rollup(
    data,
    (v) => new Set(v.map((d) => d["Mã đơn hàng"])).size, 
    (d) => `${d["Mã nhóm hàng"]} - ${d["Tên nhóm hàng"]}`
  );

  let itemOrderCount = d3.rollup(
    data,
    (v) => new Set(v.map((d) => d["Mã đơn hàng"])).size, 
    (d) => `${d["Mã nhóm hàng"]} - ${d["Tên nhóm hàng"]}`,
    (d) => `${d["Mã mặt hàng"]} - ${d["Tên mặt hàng"]}`
  );

  let groupItemProbabilities = new Map();
  itemOrderCount.forEach((items, group) => {
    let totalOrders = totalOrdersByGroup.get(group) || 1; 
    let itemProbabilities = Array.from(items, ([item, count]) => ({
      item: item,
      probability: count / totalOrders,
    }));
    groupItemProbabilities.set(group, itemProbabilities);
  });

  console.log("✅ Group Item Probabilities:", groupItemProbabilities);

  // Chart for Q9
  const chartContainer = d3.select("#chart9");
  const width = 600,
    height = 300,
    margin = { top: 30, right: 50, bottom: 80, left: 200 };

  groupItemProbabilities.forEach((items, group) => {
    console.log(`Group: ${group}, Items:`, items);

    let validItems = items.filter((d) => d.probability !== undefined && d.item);
    if (validItems.length === 0) {
      console.warn(`⚠ No valid data for group: ${group}`);
      return; 
    }

    let sanitizedGroup = group.replace(/[^a-zA-Z0-9-_]/g, ""); 
    let chartDiv = chartContainer.append("div").attr("class", "chart");

    chartDiv.append("h3").text(group);

    let svg = chartDiv
      .append("svg")
      .attr("id", `chart-${sanitizedGroup}`)
      .attr("width", width)
      .attr("height", height);

    drawBarChart(
      validItems,
      `#chart-${sanitizedGroup}`,
      "item",
      "horizontal",
      width,
      height
    );
  });

  //Q10

  let totalOrdersByGroupMonth = d3.rollup(
    data,
    (v) => new Set(v.map((d) => d["Mã đơn hàng"])).size, 
    (d) => `${d["Mã nhóm hàng"]} - ${d["Tên nhóm hàng"]}`,
    (d) => d.month
  );

  let itemOrderCountByMonth = d3.rollup(
    data,
    (v) => new Set(v.map((d) => d["Mã đơn hàng"])).size, 
    (d) => `${d["Mã nhóm hàng"]} - ${d["Tên nhóm hàng"]}`,
    (d) => d.month,
    (d) => `${d["Mã mặt hàng"]} - ${d["Tên mặt hàng"]}`
  );

  let groupItemProbabilitiesByMonth = new Map();
  itemOrderCountByMonth.forEach((months, group) => {
    let monthProbabilities = new Map();
    months.forEach((items, month) => {
      let totalOrders = totalOrdersByGroupMonth.get(group)?.get(month) || 1; 
      let itemProbabilities = Array.from(items, ([item, count]) => ({
        item: item,
        month: month,
        probability: count / totalOrders,
      }));
      monthProbabilities.set(month, itemProbabilities);
    });
    groupItemProbabilitiesByMonth.set(group, monthProbabilities);
  });

  console.log(
    "✅ Group Item Probabilities by Month:",
    groupItemProbabilitiesByMonth
  );

  let groupItemProbabilitiesFormatted = new Map();

  groupItemProbabilitiesByMonth.forEach((months, group) => {
    let itemData = new Map();

    months.forEach((items, month) => {
      items.forEach(({ item, probability }) => {
        if (!itemData.has(item)) {
          itemData.set(item, []);
        }
        itemData.get(item).push({ month, probability });
      });
    });

    groupItemProbabilitiesFormatted.set(group, itemData);
  });

  console.log("✅ Restructured Data:", groupItemProbabilitiesFormatted);
  
  drawBarChart(itemSales, "#chart1", "item", "horizontal");
  drawBarChart(groupSales, "#chart2", "group", "horizontal");
  drawBarChart(monthSales, "#chart3", "month", "vertical");
  drawBarChart(avgSalesData, "#chart4", "day", "vertical");
  drawBarChart(avgSalesDataByDayOfMonth, "#chart5", "day", "vertical");
  drawBarChart(avgSalesDataByHour, "#chart6", "hour", "vertical");  
  drawBarChart(groupOrderProb, "#chart7", "group", "horizontal");

  let groupedData = d3.group(formattedData, (d) => d.group);

  console.log(groupedData);

  // Chart for Q8
  drawLineChart(groupedData, "#chart8");
  let chartContainer10 = d3.select("#chart10"); 

  groupItemProbabilitiesFormatted.forEach((itemData, group) => {
    console.log(`Drawing chart for Group: ${group}`, itemData);

    let sanitizedGroup = group.replace(/[^a-zA-Z0-9-_]/g, "");
    let uniqueId = `chart-${sanitizedGroup}-${Date.now()}-${Math.floor(
      Math.random() * 1000
    )}`; // Ensure unique ID

    let chartDiv = chartContainer10
      .append("div")
      .attr("class", "chart")
      .style("margin-bottom", "40px"); 

    chartDiv.append("h3").text(group);

    let svg = chartDiv
      .append("svg")
      .attr("id", uniqueId)
      .attr("width", width)
      .attr("height", height);

    drawLineChart(
      itemData, 
      `#${uniqueId}`, 
      width,
      height
    );
  });
});

function drawBarChart(
  data,
  chartID,
  labelKey,
  orientation,
  width = 800,
  height = 600
) {
  const margin = { top: 20, right: 50, bottom: 120, left: 250 }; 
  const svg = d3.select(chartID);

  svg.selectAll("*").remove();

  let xScale, yScale;
  let valueKey = data[0].probability !== undefined ? "probability" : "revenue";

  if (orientation === "horizontal") {
    xScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d[valueKey])]) 
      .range([margin.left, width - margin.right]);

    yScale = d3
      .scaleBand()
      .domain(data.map((d) => d[labelKey]))
      .range([margin.top, height - margin.bottom])
      .padding(0.3);

    // Draw bars
    svg
      .selectAll("rect")
      .data(data)
      .enter()
      .append("rect")
      .attr("x", margin.left)
      .attr("y", (d) => yScale(d[labelKey]))
      .attr("width", (d) => xScale(d[valueKey]) - margin.left)
      .attr("height", yScale.bandwidth())
      .attr("fill", (d, i) => d3.schemeCategory10[i % 10]); 

    let xAxis = d3.axisBottom(xScale).ticks(5);

    if (valueKey === "probability") {
      xAxis.tickFormat(d3.format(".0%"));
    }

    svg
      .append("g")
      .attr("transform", `translate(0, ${height - margin.bottom})`)
      .call(xAxis);

    svg
      .append("g")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(yScale));
  } else {
 
    xScale = d3
      .scaleBand()
      .domain(data.map((d) => d[labelKey]))
      .range([margin.left, width - margin.right])
      .padding(0.3);

    yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.revenue)])
      .range([height - margin.bottom, margin.top]);

    svg
      .selectAll("rect")
      .data(data)
      .enter()
      .append("rect")
      .attr("x", (d) => xScale(d[labelKey]))
      .attr("y", (d) => yScale(d.revenue))
      .attr("width", xScale.bandwidth())
      .attr("height", (d) => height - margin.bottom - yScale(d.revenue))
      .attr("fill", "orange");

    svg
      .append("g")
      .attr("transform", `translate(0, ${height - margin.bottom})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text") 
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end");

    svg
      .append("g")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(yScale));
  }
}

function drawLineChart(groupedData, chartID, width = 800, height = 600) {
  const margin = { top: 40, right: 150, bottom: 50, left: 80 };
  const svg = d3.select(chartID).attr("width", width).attr("height", height);

  svg.selectAll("*").remove();

  const allData = [...groupedData.values()].flat();

  const xScale = d3
    .scalePoint()
    .domain([...new Set(allData.map((d) => d.month))])
    .range([margin.left, width - margin.right]);

  const yScale = d3
    .scaleLinear()
    .domain([0, d3.max(allData, (d) => d.probability) * 1.1])
    .range([height - margin.bottom, margin.top]);

  const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

  svg
    .append("g")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(xScale))
    .selectAll("text")
    .style("text-anchor", "middle");

  svg
    .append("g")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(yScale).ticks(5).tickFormat(d3.format(".0%"))); 


  svg
    .append("g")
    .attr("class", "grid")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(
      d3
        .axisLeft(yScale)
        .tickSize(-width + margin.left + margin.right)
        .tickFormat("")
    );


  groupedData.forEach((values, group) => {
    let sanitizedGroup = group
      .normalize("NFD") 
      .replace(/[\u0300-\u036f]/g, "") 
      .replace(/\s+/g, "-") 
      .replace(/[^a-zA-Z0-9-_]/g, ""); 

    let line = d3
      .line()
      .x((d) => xScale(d.month))
      .y((d) => yScale(d.probability))
      .curve(d3.curveLinear); 

    svg
      .append("path")
      .datum(values)
      .attr("fill", "none")
      .attr("stroke", colorScale(group))
      .attr("stroke-width", 2)
      .attr("d", line);

    svg
      .selectAll(`.dot-${sanitizedGroup}`)
      .data(values)
      .enter()
      .append("circle")
      .attr("cx", (d) => xScale(d.month))
      .attr("cy", (d) => yScale(d.probability))
      .attr("r", 4)
      .attr("fill", colorScale(group))
      .attr("stroke", "white")
      .attr("stroke-width", 1);
  });

  let legend = svg
    .append("g")
    .attr(
      "transform",
      `translate(${width - margin.right + 10}, ${margin.top})`
    );
  let legendEntries = [...groupedData.keys()];

  legendEntries.forEach((group, i) => {
    legend
      .append("circle")
      .attr("cx", 0)
      .attr("cy", i * 20)
      .attr("r", 5)
      .attr("fill", colorScale(group));

    legend
      .append("text")
      .attr("x", 10)
      .attr("y", i * 20 + 5)
      .text(group)
      .attr("font-size", "12px")
      .attr("alignment-baseline", "middle");
  });
}
