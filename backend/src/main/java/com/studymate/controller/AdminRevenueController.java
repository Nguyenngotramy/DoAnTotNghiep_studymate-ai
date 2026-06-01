package com.studymate.controller;

import com.studymate.model.MembershipPayment;
import com.studymate.model.MembershipPayment.PaymentStatus;
import com.studymate.repository.MembershipPaymentRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/admin/revenue")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminRevenueController {

    private final MembershipPaymentRepository paymentRepo;

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportExcel(
            @RequestParam(required = false) String range,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(defaultValue = "10") int taxRate) throws IOException {

        List<MembershipPayment> approvedPayments = paymentRepo.findByStatusOrderByCreatedAtDesc(PaymentStatus.APPROVED);

        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            // Sheet 1: Giao dịch
            Sheet transactionsSheet = workbook.createSheet("Giao dịch");

            // Header style
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);

            // Data style
            CellStyle dataStyle = workbook.createCellStyle();
            dataStyle.setBorderBottom(BorderStyle.THIN);
            dataStyle.setBorderTop(BorderStyle.THIN);
            dataStyle.setBorderLeft(BorderStyle.THIN);
            dataStyle.setBorderRight(BorderStyle.THIN);

            // Currency style
            CellStyle currencyStyle = workbook.createCellStyle();
            currencyStyle.cloneStyleFrom(dataStyle);
            DataFormat format = workbook.createDataFormat();
            currencyStyle.setDataFormat(format.getFormat("#,##0"));

            // Create header row
            Row headerRow = transactionsSheet.createRow(0);
            String[] headers = {"Mã đơn", "Người dùng", "Email", "Gói", "Kỳ hạn", "Số tiền", "Mã chuyển khoản", "Trạng thái", "Ngày tạo", "Ngày duyệt"};
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Fill data
            DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm").withZone(ZoneId.systemDefault());
            int rowNum = 1;
            long totalRevenue = 0;

            for (MembershipPayment payment : approvedPayments) {
                Row row = transactionsSheet.createRow(rowNum++);

                createCell(row, 0, payment.getId(), dataStyle);
                createCell(row, 1, payment.getUserFullName(), dataStyle);
                createCell(row, 2, payment.getUserEmail(), dataStyle);
                createCell(row, 3, payment.getTier().name(), dataStyle);
                createCell(row, 4, payment.getPeriod().name(), dataStyle);
                createCell(row, 5, payment.getAmountVnd(), currencyStyle);
                createCell(row, 6, payment.getTransferCode(), dataStyle);
                createCell(row, 7, payment.getStatus().name(), dataStyle);
                createCell(row, 8, payment.getCreatedAt() != null ? dateFormatter.format(payment.getCreatedAt()) : "", dataStyle);
                createCell(row, 9, payment.getApprovedAt() != null ? dateFormatter.format(payment.getApprovedAt()) : "", dataStyle);

                totalRevenue += payment.getAmountVnd();
            }

            // Auto-size columns
            for (int i = 0; i < headers.length; i++) {
                transactionsSheet.autoSizeColumn(i);
            }

            // Sheet 2: Tổng hợp
            Sheet summarySheet = workbook.createSheet("Tổng hợp");

            Row summaryHeader = summarySheet.createRow(0);
            String[] summaryHeaders = {"Chỉ tiêu", "Giá trị"};
            for (int i = 0; i < summaryHeaders.length; i++) {
                Cell cell = summaryHeader.createCell(i);
                cell.setCellValue(summaryHeaders[i]);
                cell.setCellStyle(headerStyle);
            }

            long taxAmount = (totalRevenue * taxRate) / 100;
            long netRevenue = totalRevenue - taxAmount;

            String[][] summaryData = {
                    {"Tổng doanh thu gói thành viên", String.valueOf(totalRevenue)},
                    {"Thuế (" + taxRate + "%)", String.valueOf(taxAmount)},
                    {"Doanh thu sau thuế", String.valueOf(netRevenue)},
                    {"Số đơn đã duyệt", String.valueOf(approvedPayments.size())}
            };

            for (int i = 0; i < summaryData.length; i++) {
                Row row = summarySheet.createRow(i + 1);
                createCell(row, 0, summaryData[i][0], dataStyle);
                if (i < 3) {
                    createCell(row, 1, Long.parseLong(summaryData[i][1]), currencyStyle);
                } else {
                    createCell(row, 1, summaryData[i][1], dataStyle);
                }
            }

            for (int i = 0; i < summaryHeaders.length; i++) {
                summarySheet.autoSizeColumn(i);
            }

            // Write to byte array
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            workbook.write(outputStream);

            // Set headers
            HttpHeaders httpHeaders = new HttpHeaders();
            httpHeaders.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            httpHeaders.setContentDispositionFormData("attachment", "bao_cao_doanh_thu_" + range + "_" + java.time.LocalDate.now() + ".xlsx");

            return ResponseEntity.ok()
                    .headers(httpHeaders)
                    .body(outputStream.toByteArray());
        }
    }

    private void createCell(Row row, int column, String value, CellStyle style) {
        Cell cell = row.createCell(column);
        cell.setCellValue(value);
        cell.setCellStyle(style);
    }

    private void createCell(Row row, int column, long value, CellStyle style) {
        Cell cell = row.createCell(column);
        cell.setCellValue(value);
        cell.setCellStyle(style);
    }
}
