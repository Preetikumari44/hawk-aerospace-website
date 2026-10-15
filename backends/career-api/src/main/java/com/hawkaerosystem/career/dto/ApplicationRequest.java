package com.hawkaerosystem.career.dto;

import com.hawkaerosystem.career.validation.InputNormalizer;
import com.hawkaerosystem.career.validation.YesNo;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.web.multipart.MultipartFile;

/**
 * Multipart form contract of {@code POST /api/applications}. External field names are identical to the original
 * PHP/HTML form (fullName, email, country, phoneCode, phone, residency, hasExperience, experienceInfo, ownDrone,
 * ownDroneInfo, willingTravel, visaInvestment, hasLicense, licenseFile, cvFile). Messages for the three client-side
 * rules (name, email, phone) are the same texts the frontend shows.
 *
 * <p>Setters normalise input before validation runs.
 */
public class ApplicationRequest {

    public static final String MSG_NAME = "Please enter your full name.";
    public static final String MSG_EMAIL = "Please enter a valid email address.";
    public static final String MSG_PHONE = "Phone number must be 7\u201315 digits and contain only numbers.";
    public static final String NOT_PROVIDED = "Not Provided";

    @NotBlank(message = MSG_NAME)
    @Size(min = 3, max = 150, message = MSG_NAME)
    private String fullName;

    @NotBlank(message = MSG_EMAIL)
    @Size(max = 254, message = MSG_EMAIL)
    @Pattern(regexp = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$", message = MSG_EMAIL)
    private String email;

    @NotBlank(message = "Country is required.")
    @Size(max = 100, message = "Country is too long.")
    private String country;

    @NotBlank(message = "Dialling code is required.")
    @Pattern(regexp = "^\\+[0-9]{1,4}$", message = "Dialling code must look like +91.")
    private String phoneCode;

    @NotBlank(message = MSG_PHONE)
    @Pattern(regexp = "^[0-9]{7,15}$", message = MSG_PHONE)
    private String phone;

    @YesNo(message = "Please answer whether you currently live in the EU or UK.")
    private String residency;

    @YesNo(message = "Please answer whether you have prior drone experience.")
    private String hasExperience;

    @Size(max = 1000, message = "Experience details are too long (maximum 1000 characters).")
    private String experienceInfo;

    @YesNo(message = "Please answer whether you own an agricultural drone.")
    private String ownDrone;

    @Size(max = 1000, message = "Drone details are too long (maximum 1000 characters).")
    private String ownDroneInfo;

    @YesNo(message = "Please answer whether you are willing to travel.")
    private String willingTravel;

    @YesNo(message = "Please answer the visa investment question.")
    private String visaInvestment;

    @YesNo(message = "Please answer whether you hold a drone pilot licence.")
    private String hasLicense;

    private MultipartFile licenseFile;
    private MultipartFile cvFile;

    public String getFullName() { return fullName; }
    public void setFullName(String v) { this.fullName = InputNormalizer.text(v); }

    public String getEmail() { return email; }
    public void setEmail(String v) { this.email = InputNormalizer.email(v); }

    public String getCountry() { return country; }
    public void setCountry(String v) { this.country = InputNormalizer.text(v); }

    public String getPhoneCode() { return phoneCode; }
    public void setPhoneCode(String v) { this.phoneCode = InputNormalizer.phoneCode(v); }

    public String getPhone() { return phone; }
    public void setPhone(String v) { this.phone = InputNormalizer.phone(v); }

    public String getResidency() { return residency; }
    public void setResidency(String v) { this.residency = InputNormalizer.yesNo(v); }

    public String getHasExperience() { return hasExperience; }
    public void setHasExperience(String v) { this.hasExperience = InputNormalizer.yesNo(v); }

    public String getExperienceInfo() { return experienceInfo; }
    public void setExperienceInfo(String v) { this.experienceInfo = InputNormalizer.text(v); }

    public String getOwnDrone() { return ownDrone; }
    public void setOwnDrone(String v) { this.ownDrone = InputNormalizer.yesNo(v); }

    public String getOwnDroneInfo() { return ownDroneInfo; }
    public void setOwnDroneInfo(String v) { this.ownDroneInfo = InputNormalizer.text(v); }

    public String getWillingTravel() { return willingTravel; }
    public void setWillingTravel(String v) { this.willingTravel = InputNormalizer.yesNo(v); }

    public String getVisaInvestment() { return visaInvestment; }
    public void setVisaInvestment(String v) { this.visaInvestment = InputNormalizer.yesNo(v); }

    public String getHasLicense() { return hasLicense; }
    public void setHasLicense(String v) { this.hasLicense = InputNormalizer.yesNo(v); }

    public MultipartFile getLicenseFile() { return licenseFile; }
    public void setLicenseFile(MultipartFile licenseFile) { this.licenseFile = licenseFile; }

    public MultipartFile getCvFile() { return cvFile; }
    public void setCvFile(MultipartFile cvFile) { this.cvFile = cvFile; }

    /** Same default the PHP script used when the optional free-text answers are absent. */
    public String experienceInfoOrDefault() {
        return experienceInfo == null || experienceInfo.isBlank() ? NOT_PROVIDED : experienceInfo;
    }

    public String ownDroneInfoOrDefault() {
        return ownDroneInfo == null || ownDroneInfo.isBlank() ? NOT_PROVIDED : ownDroneInfo;
    }
}
