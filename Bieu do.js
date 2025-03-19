const sheetURL =
  "https://docs.google.com/spreadsheets/d/1RrgLJ5nfgdJ2AzKRaDhOqeIcsLBO0G1W9g7Lj0Z0W5Q/gviz/tq?tqx=out:csv";

d3.csv(sheetURL).then((data) => {
  console.log("✅ Raw Data Loaded:", data);

  // Trim and clean up column names
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

  // Process Data for "Doanh số theo Mặt hàng"
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

  // Process Data for "Doanh số theo Nhóm hàng"
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

  // Process Data for "Doanh số theo Tháng"
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

  // Process Data for "Xác suất bán hàng theo Nhóm hàng"
  let totalOrders = new Set(data.map((d) => d["Mã đơn hàng"])).size;
  let groupOrderCount = d3.rollup(
    data,
    (v) => new Set(v.map((d) => d["Mã đơn hàng"])).size, // Count unique orders per group
    (d) => `${d["Mã nhóm hàng"]} - ${d["Tên nhóm hàng"]}`
  );

  let groupOrderProb = Array.from(groupOrderCount, ([key, value]) => ({
    group: key,
    probability: value / totalOrders,
  }));
  groupOrderProb.sort((a, b) => b.probability - a.probability);
  console.log("✅ Group Order Probability Data:", groupOrderProb);

  // Remove invalid months
  data = data.filter((d) => !isNaN(d.month));

  // Unique orders per month
  let totalOrdersPerMonth = d3.rollup(
    data,
    (v) => new Set(v.map((d) => d.order)).size,
    (d) => d.month
  );

  // Unique orders per Nhóm hàng per month
  let groupOrdersPerMonth = d3.rollup(
    data,
    (v) => new Set(v.map((d) => d.order)).size,
    (d) => d.month,
    (d) => d.group
  );

  // Convert to array format
  let formattedData = [];
  groupOrdersPerMonth.forEach((groups, month) => {
    groups.forEach((count, group) => {
      formattedData.push({
        month: `T${month}`, // Format as "T01", "T02", ...
        group,
        probability: count / (totalOrdersPerMonth.get(month) || 1),
      });
    });
  });

  // Step 1: Group orders by Nhóm hàng and Mặt hàng
  let totalOrdersByGroup = d3.rollup(
    data,
    (v) => new Set(v.map((d) => d["Mã đơn hàng"])).size, // Count unique orders per Nhóm hàng
    (d) => `${d["Mã nhóm hàng"]} - ${d["Tên nhóm hàng"]}`
  );

  let itemOrderCount = d3.rollup(
    data,
    (v) => new Set(v.map((d) => d["Mã đơn hàng"])).size, // Count unique orders per Mặt hàng within each Nhóm hàng
    (d) => `${d["Mã nhóm hàng"]} - ${d["Tên nhóm hàng"]}`,
    (d) => `${d["Mã mặt hàng"]} - ${d["Tên mặt hàng"]}`
  );

  // Step 2: Compute probability for each Mặt hàng inside each Nhóm hàng
  let groupItemProbabilities = new Map();
  itemOrderCount.forEach((items, group) => {
    let totalOrders = totalOrdersByGroup.get(group) || 1; // Avoid division by zero
    let itemProbabilities = Array.from(items, ([item, count]) => ({
      item: item,
      probability: count / totalOrders,
    }));
    groupItemProbabilities.set(group, itemProbabilities);
  });

  console.log("✅ Group Item Probabilities:", groupItemProbabilities);

  // Step 3: Create a chart for each Nhóm hàng
  const chartContainer = d3.select("#chart9");
  const width = 600,
    height = 300,
    margin = { top: 30, right: 50, bottom: 80, left: 200 };

  // Loop through each Nhóm hàng (group) and create a chart
  groupItemProbabilities.forEach((items, group) => {
    console.log(`Group: ${group}, Items:`, items);

    let validItems = items.filter((d) => d.probability !== undefined && d.item);
    if (validItems.length === 0) {
      console.warn(`⚠ No valid data for group: ${group}`);
      return; // Skip rendering if no valid data
    }

    let sanitizedGroup = group.replace(/[^a-zA-Z0-9-_]/g, ""); // Sanitize ID
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
  // Step 1: Group orders by Nhóm hàng, Mặt hàng, and Tháng
  let totalOrdersByGroupMonth = d3.rollup(
    data,
    (v) => new Set(v.map((d) => d["Mã đơn hàng"])).size, // Count unique orders per Nhóm hàng per Tháng
    (d) => `${d["Mã nhóm hàng"]} - ${d["Tên nhóm hàng"]}`,
    (d) => d.month
  );

  let itemOrderCountByMonth = d3.rollup(
    data,
    (v) => new Set(v.map((d) => d["Mã đơn hàng"])).size, // Count unique orders per Mặt hàng within each Nhóm hàng per Tháng
    (d) => `${d["Mã nhóm hàng"]} - ${d["Tên nhóm hàng"]}`,
    (d) => d.month,
    (d) => `${d["Mã mặt hàng"]} - ${d["Tên mặt hàng"]}`
  );

  // Step 2: Compute probability for each Mặt hàng inside each Nhóm hàng per Tháng
  let groupItemProbabilitiesByMonth = new Map();
  itemOrderCountByMonth.forEach((months, group) => {
    let monthProbabilities = new Map();
    months.forEach((items, month) => {
      let totalOrders = totalOrdersByGroupMonth.get(group)?.get(month) || 1; // Avoid division by zero
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
  
  // Group by day and calculate average revenue
  const thuMap = {
    0: "Thứ 2",
    1: "Thứ 3",
    2: "Thứ 4",
    3: "Thứ 5",
    4: "Thứ 6",
    5: "Thứ 7",
    6: "CN"
  };

  // Add 'Thu' and 'Ngày/Tháng/Năm' columns
  data.forEach(d => {
    const date = new Date(d["Thời gian tạo đơn"]);
    d["Thu"] = thuMap[date.getDay()];
    d["Ngày/Tháng/Năm"] = date.toLocaleDateString("vi-VN");
  });

  // Group data by 'Thu'
  let groupedDataByThu = d3.group(data, d => d["Thu"]);

  // Compute average revenue per weekday
  let avgSalesData = Array.from(groupedDataByThu, ([thu, orders]) => {
    let uniqueDates = new Set(orders.map(o => o["Ngày/Tháng/Năm"])).size; // Count distinct order dates
    let totalRevenue = d3.sum(orders, o => o["Thành tiền"]); // Sum revenue for the day
    return {
      day: thu,
      revenue: uniqueDates ? totalRevenue / uniqueDates : 0 // Avoid division by zero
    };
  });

  // Sort days in correct order (Thứ 2 to CN)
  const dayOrder = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN"];
  avgSalesData.sort((a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day));

  console.log(avgSalesData);
  
  // Q5
  // Group by day of the month and calculate average revenue
  let groupedDataByDayOfMonth = d3.group(data, d => new Date(d["Thời gian tạo đơn"]).getDate());

  // Compute average revenue per day of the month
  let avgSalesDataByDayOfMonth = Array.from(groupedDataByDayOfMonth, ([day, orders]) => {
    let uniqueDates = new Set(orders.map(o => o["Ngày/Tháng/Năm"])).size; // Count distinct order dates
    let totalRevenue = d3.sum(orders, o => o["Thành tiền"]); // Sum revenue for the day
    return {
      day: day,
      revenue: uniqueDates ? totalRevenue / uniqueDates : 0 // Avoid division by zero
    };
  });

  // Sort days in correct order (1 to 31)
  avgSalesDataByDayOfMonth.sort((a, b) => a.day - b.day);

  console.log("✅ Average Sales Data by Day of Month:", avgSalesDataByDayOfMonth);
  //Q6
  // Group by hour and calculate average revenue
  let groupedDataByHour = d3.group(data, d => new Date(d["Thời gian tạo đơn"]).getHours());

  // Compute average revenue per hour
  let avgSalesDataByHour = Array.from(groupedDataByHour, ([hour, orders]) => {
    let uniqueDates = new Set(orders.map(o => o["Ngày/Tháng/Năm"])).size; // Count distinct order dates
    let totalRevenue = d3.sum(orders, o => o["Thành tiền"]); // Sum revenue for the hour
    return {
      hour: `${String(hour).padStart(2, '0')}:00-${String(hour).padStart(2, '0')}:59`, // Format as "08:00-08:59", "09:00-09:59", ...
      revenue: uniqueDates ? totalRevenue / uniqueDates : 0 // Avoid division by zero
    };
  });

  // Sort hours in correct order (0 to 23)
  avgSalesDataByHour.sort((a, b) => a.hour.localeCompare(b.hour));

  console.log("✅ Average Sales Data by Hour:", avgSalesDataByHour);


  // ...existing code...

  // Q11
  // ...existing code...
  const customerPurchaseCounts = Array.from(
    d3.group(data, (d) => d["Mã khách hàng"]), // Nhóm theo mã khách hàng
    ([customerID, orders]) => ({
      "Mã khách hàng": customerID,
      "Lượt mua": new Set(orders.map((d) => d["Mã đơn hàng"])).size // Đếm số đơn hàng duy nhất
    })
  );  
  console.log("✅ Customer Purchase Counts:", customerPurchaseCounts);
  const purchaseFrequency = Array.from(
    d3.rollup(
      customerPurchaseCounts,
      (v) => v.length, // Đếm số khách hàng có cùng "Lượt mua"
      (d) => d["Lượt mua"]
    ),
    ([purchaseCount, customerCount]) => ({
      "Lượt mua": purchaseCount,
      "Số khách hàng": customerCount
    })
  );
  
    
  console.log("✅ Purchase Frequency Data:", purchaseFrequency);

// ...existing code...
// ...existing code...
  // Draw Charts
  drawBarChart(itemSales, "#chart1", "item", "horizontal");
  drawBarChart(groupSales, "#chart2", "group", "horizontal");
  drawBarChart(monthSales, "#chart3", "month", "vertical");
  drawBarChart(avgSalesData, "#chart4", "day", "vertical");
  drawBarChart(avgSalesDataByDayOfMonth, "#chart5", "day", "vertical");
  drawBarChart(avgSalesDataByHour, "#chart6", "hour", "vertical");  
  drawBarChart(groupOrderProb, "#chart7", "group", "horizontal");
  drawBarChart(purchaseFrequency, "#chart11", "Lượt mua", "vertical");

  // Group data by Nhóm hàng
  let groupedData = d3.group(formattedData, (d) => d.group);

  console.log(groupedData);

  // Draw the line chart
  drawLineChart(groupedData, "#chart8");
  let chartContainer10 = d3.select("#chart10"); // Select the container

  groupItemProbabilitiesFormatted.forEach((itemData, group) => {
    console.log(`Drawing chart for Group: ${group}`, itemData);

    let sanitizedGroup = group.replace(/[^a-zA-Z0-9-_]/g, ""); // Sanitize ID
    let uniqueId = `chart-${sanitizedGroup}-${Date.now()}-${Math.floor(
      Math.random() * 1000
    )}`; // Ensure unique ID

    let chartDiv = chartContainer10
      .append("div")
      .attr("class", "chart")
      .style("margin-bottom", "40px"); // Add spacing between charts

    chartDiv.append("h3").text(group);

    let svg = chartDiv
      .append("svg")
      .attr("id", uniqueId)
      .attr("width", width)
      .attr("height", height);

    drawLineChart(
      itemData, // Use your existing `drawLineChart` function
      `#${uniqueId}`, // Pass the unique ID
      width,
      height
    );
  });
});

// Function to Draw Bar Charts
function drawBarChart(
  data,
  chartID,
  labelKey,
  orientation,
  width = 800,
  height = 600
) {
  const margin = { top: 20, right: 50, bottom: 120, left: 250 }; // Increased bottom margin
  const svg = d3.select(chartID);

  // Remove previous elements before redrawing
  svg.selectAll("*").remove();

  let xScale, yScale;
  let valueKey = data[0].probability !== undefined ? "probability" : "revenue"; // Auto-detect key

  if (orientation === "horizontal") {
    xScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d[valueKey])]) // No NaN values
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
      .attr("fill", (d, i) => d3.schemeCategory10[i % 10]); // Different colors

    // Add x-axis
    let xAxis = d3.axisBottom(xScale).ticks(5);

    // Format as percentage **ONLY** for probability-based charts
    if (valueKey === "probability") {
      xAxis.tickFormat(d3.format(".0%"));
    }

    svg
      .append("g")
      .attr("transform", `translate(0, ${height - margin.bottom})`)
      .call(xAxis);

    // Add y-axis
    svg
      .append("g")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(yScale));
  } else {
    // Vertical bar chart (for revenue)
    xScale = d3
      .scaleBand()
      .domain(data.map((d) => d[labelKey]))
      .range([margin.left, width - margin.right])
      .padding(0.3);

    yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.revenue)])
      .range([height - margin.bottom, margin.top]);

    // Draw bars
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

    // Add x-axis
    svg
      .append("g")
      .attr("transform", `translate(0, ${height - margin.bottom})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text") // Rotate x-axis labels
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end");

    // Add y-axis (No percentage formatting here!)
    svg
      .append("g")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(yScale));
  }
}

function drawLineChart(groupedData, chartID, width = 800, height = 600) {
  const margin = { top: 40, right: 150, bottom: 50, left: 80 };
  const svg = d3.select(chartID).attr("width", width).attr("height", height);

  // Remove previous elements before redrawing
  svg.selectAll("*").remove();

  // Flatten data for scales
  const allData = [...groupedData.values()].flat();

  // Define scales
  const xScale = d3
    .scalePoint()
    .domain([...new Set(allData.map((d) => d.month))])
    .range([margin.left, width - margin.right]);

  const yScale = d3
    .scaleLinear()
    .domain([0, d3.max(allData, (d) => d.probability) * 1.1])
    .range([height - margin.bottom, margin.top]);

  const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

  // Draw X & Y axis
  svg
    .append("g")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(xScale))
    .selectAll("text")
    .style("text-anchor", "middle");

  svg
    .append("g")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(yScale).ticks(5).tickFormat(d3.format(".0%"))); // Format as percentage

  // Draw gridlines
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

  // Draw line for each Nhóm hàng
  groupedData.forEach((values, group) => {
    let sanitizedGroup = group
      .normalize("NFD") // Normalize accented characters
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/[^a-zA-Z0-9-_]/g, ""); // Remove any other invalid characters

    let line = d3
      .line()
      .x((d) => xScale(d.month))
      .y((d) => yScale(d.probability))
      .curve(d3.curveLinear); // 🔹 STRAIGHT LINES, NO CURVES

    svg
      .append("path")
      .datum(values)
      .attr("fill", "none")
      .attr("stroke", colorScale(group))
      .attr("stroke-width", 2)
      .attr("d", line);

    // Add dots
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

  // Add legend
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
