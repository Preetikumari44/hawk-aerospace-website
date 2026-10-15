package com.hawkaerosystem.career.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Maps the EXISTING {@code drone_applications} table. The column list is exactly the one written by the original
 * PHP INSERT (fullName, email, phoneCode, phone, country, residency, hasLicense, hasExperience, experienceInfo,
 * ownDrone, ownDroneInfo, willingTravel, visaInvestment, cvFile, licenseFile) plus the auto-increment {@code id}
 * the PHP duplicate check selected. Any other columns that may exist (e.g. a created-at timestamp with a default)
 * are intentionally not mapped and keep their database defaults.
 *
 * <p>{@code cvFile} / {@code licenseFile} hold a storage key relative to the storage root ({@code cv/<uuid>.pdf}),
 * not a public URL. Rows written by the old PHP code hold {@code uploads/cv/...} paths and are left untouched.
 */
@Entity
@Table(name = "drone_applications")
public class DroneApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "fullName")
    private String fullName;

    @Column(name = "email")
    private String email;

    @Column(name = "phoneCode")
    private String phoneCode;

    @Column(name = "phone")
    private String phone;

    @Column(name = "country")
    private String country;

    @Column(name = "residency")
    private String residency;

    @Column(name = "hasLicense")
    private String hasLicense;

    @Column(name = "hasExperience")
    private String hasExperience;

    @Column(name = "experienceInfo", length = 1000)
    private String experienceInfo;

    @Column(name = "ownDrone")
    private String ownDrone;

    @Column(name = "ownDroneInfo", length = 1000)
    private String ownDroneInfo;

    @Column(name = "willingTravel")
    private String willingTravel;

    @Column(name = "visaInvestment")
    private String visaInvestment;

    @Column(name = "cvFile")
    private String cvFile;

    @Column(name = "licenseFile")
    private String licenseFile;

    protected DroneApplication() {
        // for JPA
    }

    public DroneApplication(String fullName, String email, String phoneCode, String phone, String country,
                            String residency, String hasLicense, String hasExperience, String experienceInfo,
                            String ownDrone, String ownDroneInfo, String willingTravel, String visaInvestment,
                            String cvFile, String licenseFile) {
        this.fullName = fullName;
        this.email = email;
        this.phoneCode = phoneCode;
        this.phone = phone;
        this.country = country;
        this.residency = residency;
        this.hasLicense = hasLicense;
        this.hasExperience = hasExperience;
        this.experienceInfo = experienceInfo;
        this.ownDrone = ownDrone;
        this.ownDroneInfo = ownDroneInfo;
        this.willingTravel = willingTravel;
        this.visaInvestment = visaInvestment;
        this.cvFile = cvFile;
        this.licenseFile = licenseFile;
    }

    public Long getId() { return id; }
    public String getFullName() { return fullName; }
    public String getEmail() { return email; }
    public String getPhoneCode() { return phoneCode; }
    public String getPhone() { return phone; }
    public String getCountry() { return country; }
    public String getResidency() { return residency; }
    public String getHasLicense() { return hasLicense; }
    public String getHasExperience() { return hasExperience; }
    public String getExperienceInfo() { return experienceInfo; }
    public String getOwnDrone() { return ownDrone; }
    public String getOwnDroneInfo() { return ownDroneInfo; }
    public String getWillingTravel() { return willingTravel; }
    public String getVisaInvestment() { return visaInvestment; }
    public String getCvFile() { return cvFile; }
    public String getLicenseFile() { return licenseFile; }
}
